import fetchMock from 'fetch-mock';
import { faker } from '@faker-js/faker';
import { RichieContextFactory as mockRichieContextFactory } from 'utils/test/factories/richie';
import { handle } from 'utils/errors/handle';
import { HttpError, HttpStatusCode } from 'utils/errors/HttpError';
import context from 'utils/context';
import API from './openedx-hawthorn';
import { location as mockedLocation } from 'utils/indirection/window';

jest.mock('utils/errors/handle');
jest.mock('utils/context', () => ({
  __esModule: true,
  default: mockRichieContextFactory({
    lms_backends: [
      {
        backend: 'openedx-hawthorn',
        course_regexp: 'course_id=(?<course_id>.*$)',
        endpoint: 'https://demo.endpoint/api',
      },
    ],
  }).one(),
}));
jest.mock('utils/indirection/window', () => {
  const assign = jest.fn();
  return {
    __esModule: true,
    location: {
      pathname: '/test/path',
      assign,
    },
  };
});
const mockHandle: jest.Mock<typeof handle> = handle as any;

describe('OpenEdX Hawthorn API', () => {
  const EDX_ENDPOINT = 'https://demo.endpoint/api';
  let courseId = '';
  let username = '';

  const LMSConf = context.lms_backends![0];
  const HawthornApi = API(LMSConf);

  afterEach(() => {
    // @ts-ignore
    mockedLocation.assign.mockClear();
  });

  describe('APIOptions', () => {
    it('if a route is overriden through APIOptions, related request uses it', async () => {
      const CustomApi = API(LMSConf, {
        routes: {
          user: {
            me: `${LMSConf.endpoint}/my-custom-api/user/v2.0/whoami`,
          },
        },
      });

      fetchMock.get(`${EDX_ENDPOINT}/my-custom-api/user/v2.0/whoami`, HttpStatusCode.UNAUTHORIZED);

      await expect(CustomApi.user.me()).resolves.toBe(null);
    });
  });

  describe('login/register next prefix', () => {
    const originalEnv = { ...process.env };

    beforeEach(() => {
      // Ensure a predictable path for next param
      mockedLocation.pathname = '/test/path';
    });

    afterEach(() => {
      process.env = { ...originalEnv };
      // @ts-ignore
      mockedLocation.assign.mockClear();
    });

    it('uses options.siteName when provided (highest priority)', () => {
      const api = API(LMSConf, { routes: {}, /* @ts-ignore */ siteName: 'richie-ap' });
      api.user.login();
      expect(mockedLocation.assign).toHaveBeenCalledWith(
        `${LMSConf.endpoint}/login?next=richie-ap/test/path`,
      );

      api.user.register();
      expect(mockedLocation.assign).toHaveBeenCalledWith(
        `${LMSConf.endpoint}/register?next=richie-ap/test/path`,
      );
    });

    it('uses RICHIE_CONTAINER_NAME environment variable when options.siteName is not provided', () => {
      process.env.RICHIE_CONTAINER_NAME = 'richie-br';
      const api = API(LMSConf);
      api.user.login();
      expect(mockedLocation.assign).toHaveBeenCalledWith(
        `${LMSConf.endpoint}/login?next=richie-br/test/path`,
      );

      api.user.register();
      expect(mockedLocation.assign).toHaveBeenCalledWith(
        `${LMSConf.endpoint}/register?next=richie-br/test/path`,
      );
    });

    it('falls back to default "richie" when neither option nor env is provided', () => {
      delete process.env.RICHIE_CONTAINER_NAME;
      const api = API(LMSConf);
      api.user.login();
      expect(mockedLocation.assign).toHaveBeenCalledWith(
        `${LMSConf.endpoint}/login?next=richie/test/path`,
      );

      api.user.register();
      expect(mockedLocation.assign).toHaveBeenCalledWith(
        `${LMSConf.endpoint}/register?next=richie/test/path`,
      );
    });
  });

  describe('enrollment', () => {
    beforeEach(() => {
      courseId = faker.string.uuid();
      username = faker.internet.username();
      fetchMock.restore();
      mockHandle.mockRestore();
    });

    describe('get', () => {
      it('returns null if the user is not enrolled to the provided course_id', async () => {
        fetchMock.get(
          `${EDX_ENDPOINT}/api/enrollment/v1/enrollment/${username},${courseId}`,
          HttpStatusCode.OK,
        );
        const response = await HawthornApi.enrollment.get(
          `https://demo.endpoint/courses?course_id=${courseId}`,
          { username },
        );
        expect(response).toBeNull();
      });

      it('returns null if the user is anonymous', async () => {
        fetchMock.get(`${EDX_ENDPOINT}/api/enrollment/v1/enrollment/${courseId}`, '');
        const response = await HawthornApi.enrollment.get(
          `https://demo.endpoint/courses?course_id=${courseId}`,
          null,
        );
        expect(response).toBeNull();
      });

      it('throws HttpError if request fails', async () => {
        fetchMock.get(
          `${EDX_ENDPOINT}/api/enrollment/v1/enrollment/${username},${courseId}`,
          HttpStatusCode.INTERNAL_SERVER_ERROR,
        );

        await expect(
          HawthornApi.enrollment.get(`https://demo.endpoint/courses?course_id=${courseId}`, {
            username,
          }),
        ).rejects.toThrow('Internal Server Error');

        expect(mockHandle).toHaveBeenCalledWith(
          new Error('[GET - Enrollment] > 500 - Internal Server Error'),
        );
      });

      it('returns course run information if user is enrolled', async () => {
        fetchMock.get(`${EDX_ENDPOINT}/api/enrollment/v1/enrollment/${username},${courseId}`, {
          is_active: true,
          user: username,
        });

        const response: any = await HawthornApi.enrollment.get(
          `https://demo.endpoint/courses?course_id=${courseId}`,
          { username },
        );

        expect(response.user).toEqual(username);
        expect(response.is_active).toBeTruthy();
      });
    });

    describe('isEnrolled', () => {
      it('returns true if user is enrolled', async () => {
        fetchMock.get(`${EDX_ENDPOINT}/api/enrollment/v1/enrollment/${username},${courseId}`, {
          is_active: true,
          user: username,
        });

        const response = await HawthornApi.enrollment.get(
          `https://demo.endpoint/courses?course_id=${courseId}`,
          { username },
        );

        expect(response).toBeTruthy();
      });

      it('returns false if user is not enrolled', async () => {
        fetchMock.get(
          `${EDX_ENDPOINT}/api/enrollment/v1/enrollment/${username},${courseId}`,
          HttpStatusCode.OK,
        );

        const enrollment = await HawthornApi.enrollment.get(
          `https://demo.endpoint/courses?course_id=${courseId}`,
          { username },
        );

        const response = await HawthornApi.enrollment.isEnrolled(enrollment);

        expect(response).toStrictEqual(false);
      });
    });

    describe('set', () => {
      it('returns true if user has been enrolled', async () => {
        fetchMock.post(`${EDX_ENDPOINT}/api/enrollment/v1/enrollment`, {
          is_active: true,
        });
        const response = await HawthornApi.enrollment.set(
          `https://demo.endpoint/courses?course_id=${courseId}`,
          { username },
        );

        expect(response).toBeTruthy();
      });

      it('throws HttpError if request fails', async () => {
        fetchMock.post(
          `${EDX_ENDPOINT}/api/enrollment/v1/enrollment`,
          HttpStatusCode.INTERNAL_SERVER_ERROR,
        );

        await expect(
          HawthornApi.enrollment.set(`https://demo.endpoint/courses?course_id=${courseId}`, {
            username,
          }),
        ).rejects.toThrow('Internal Server Error');

        expect(mockHandle).toHaveBeenCalledWith(
          new Error('[SET - Enrollment] > 500 - Internal Server Error'),
        );
      });

      it('throws HttpError.localizedMessage on enrollment failure', async () => {
        fetchMock.post(`${EDX_ENDPOINT}/api/enrollment/v1/enrollment`, {
          status: HttpStatusCode.BAD_REQUEST,
          body: { localizedMessage: 'You are not authorized to enroll in this course' },
        });

        await expect(
          HawthornApi.enrollment.set(`https://demo.endpoint/courses?course_id=${courseId}`, {
            username,
          }),
        ).rejects.toThrow(
          new HttpError(
            HttpStatusCode.BAD_REQUEST,
            'Bad Request',
            'You are not authorized to enroll in this course',
          ),
        );
      });

      it('throws HttpError on enrollment failure when localizedMessage property is not present in the payload', async () => {
        fetchMock.post(`${EDX_ENDPOINT}/api/enrollment/v1/enrollment`, {
          status: HttpStatusCode.BAD_REQUEST,
          body: { message: 'Bad Request' },
        });

        await expect(
          HawthornApi.enrollment.set(`https://demo.endpoint/courses?course_id=${courseId}`, {
            username,
          }),
        ).rejects.toThrow(new HttpError(HttpStatusCode.BAD_REQUEST, 'Bad Request'));
      });

      it('throws HttpError when response has no json payload', async () => {
        fetchMock.post(`${EDX_ENDPOINT}/api/enrollment/v1/enrollment`, HttpStatusCode.BAD_REQUEST);

        await expect(
          HawthornApi.enrollment.set(`https://demo.endpoint/courses?course_id=${courseId}`, {
            username,
          }),
        ).rejects.toThrow('Bad Request');
      });
    });
  });
});
