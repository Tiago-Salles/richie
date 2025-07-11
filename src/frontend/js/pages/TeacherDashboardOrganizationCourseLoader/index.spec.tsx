import { screen, waitFor } from '@testing-library/react';
import fetchMock from 'fetch-mock';
import userEvent from '@testing-library/user-event';
import { RichieContextFactory as mockRichieContextFactory } from 'utils/test/factories/richie';
import {
  CourseListItemFactory,
  OfferingFactory,
  OrganizationFactory,
} from 'utils/test/factories/joanie';
import { expectNoSpinner } from 'utils/test/expectSpinner';
import { mockPaginatedResponse } from 'utils/test/mockPaginatedResponse';
import { PER_PAGE } from 'settings';
import { setupJoanieSession } from 'utils/test/wrappers/JoanieAppWrapper';
import { render } from 'utils/test/render';
import { TeacherDashboardOrganizationCourseLoader } from '.';

jest.mock('utils/context', () => ({
  __esModule: true,
  default: mockRichieContextFactory({
    authentication: { backend: 'fonzie', endpoint: 'https://demo.endpoint' },
    joanie_backend: { endpoint: 'https://joanie.endpoint' },
  }).one(),
}));

jest.mock('settings', () => ({
  __esModule: true,
  ...jest.requireActual('settings'),
  PER_PAGE: { useCourseProductUnion: 25 },
}));

jest.mock('hooks/useIntersectionObserver', () => ({
  useIntersectionObserver: (props: any) => {
    (globalThis as any).__intersection_observer_props__ = props;
  },
}));

describe('components/TeacherDashboardOrganizationCourseLoader', () => {
  const joanieSessionData = setupJoanieSession();
  const perPage = PER_PAGE.useCourseProductUnion;
  let nbApiCalls: number;
  beforeEach(() => {
    nbApiCalls = joanieSessionData.nbSessionApiRequest;
  });
  afterEach(() => {
    fetchMock.restore();
  });

  it('should render', async () => {
    const organization = OrganizationFactory().one();

    fetchMock.get(
      `https://joanie.endpoint/api/v1.0/organizations/${organization.id}/`,
      organization,
    );
    nbApiCalls += 1;

    fetchMock.get(
      `https://joanie.endpoint/api/v1.0/organizations/${organization.id}/courses/?has_listed_course_runs=true&page=1&page_size=${perPage}`,
      mockPaginatedResponse(CourseListItemFactory().many(15), 15, false),
    );
    fetchMock.get(
      `https://joanie.endpoint/api/v1.0/organizations/${organization.id}/offerings/?product_type=credential&page=1&page_size=${perPage}`,
      mockPaginatedResponse(OfferingFactory().many(15), 15, false),
    );
    fetchMock.get(
      `https://joanie.endpoint/api/v1.0/organizations/${organization.id}/contracts/?signature_state=half_signed&page=1`,
      [],
    );

    render(<TeacherDashboardOrganizationCourseLoader />, {
      routerOptions: {
        path: '/:organizationId',
        initialEntries: [`/${organization.id}`],
      },
    });
    await expectNoSpinner('Loading courses...');

    nbApiCalls += 1; // course api call
    nbApiCalls += 1; // offerings api call
    nbApiCalls += 1; // contracts api call
    const calledUrls = fetchMock.calls().map((call) => call[0]);
    expect(calledUrls).toHaveLength(nbApiCalls);
    expect(calledUrls).toContain(
      `https://joanie.endpoint/api/v1.0/organizations/${organization.id}/courses/?has_listed_course_runs=true&page=1&page_size=${perPage}`,
    );
    expect(calledUrls).toContain(
      `https://joanie.endpoint/api/v1.0/organizations/${organization.id}/offerings/?product_type=credential&page=1&page_size=${perPage}`,
    );
    await expectNoSpinner('Loading organization...');

    expect(
      screen.getByRole('heading', {
        name: `Courses of ${organization.title}`,
      }),
    ).toBeInTheDocument();

    // Lessons
    expect(await screen.findAllByTestId('course-glimpse')).toHaveLength(25);
    expect(calledUrls).toHaveLength(nbApiCalls);
  });

  it('should perform search', async () => {
    const organization = OrganizationFactory().one();
    fetchMock.get(
      `https://joanie.endpoint/api/v1.0/organizations/${organization.id}/contracts/?signature_state=half_signed&page=1`,
      [],
    );
    nbApiCalls += 1;
    fetchMock.get(
      `https://joanie.endpoint/api/v1.0/organizations/${organization.id}/`,
      organization,
    );
    nbApiCalls += 1;

    fetchMock.get(
      `https://joanie.endpoint/api/v1.0/organizations/${organization.id}/courses/?has_listed_course_runs=true&page=1&page_size=${perPage}`,
      mockPaginatedResponse(CourseListItemFactory().many(15), 15, false),
    );
    fetchMock.get(
      `https://joanie.endpoint/api/v1.0/organizations/${organization.id}/offerings/?product_type=credential&page=1&page_size=${perPage}`,
      mockPaginatedResponse(OfferingFactory().many(15), 15, false),
    );

    render(<TeacherDashboardOrganizationCourseLoader />, {
      routerOptions: {
        path: '/:organizationId',
        initialEntries: [`/${organization.id}`],
      },
    });
    await expectNoSpinner('Loading courses...');
    await expectNoSpinner('Loading organization...');
    fetchMock.restore();

    fetchMock.get(
      `https://joanie.endpoint/api/v1.0/organizations/${organization.id}/courses/?query=text+query&has_listed_course_runs=true&page=1&page_size=${perPage}`,
      mockPaginatedResponse(CourseListItemFactory().many(5), 5, false),
    );
    fetchMock.get(
      `https://joanie.endpoint/api/v1.0/organizations/${organization.id}/offerings/?query=text+query&product_type=credential&page=1&page_size=${perPage}`,
      mockPaginatedResponse(OfferingFactory().many(5), 5, false),
    );
    const user = userEvent.setup();
    await user.type(screen.getByRole('textbox', { name: /Search/ }), 'text query');
    await user.click(screen.getByRole('button', { name: /Search/ }));

    nbApiCalls = 1; // course api call
    nbApiCalls += 1; // offerings api call
    const calledUrls = fetchMock.calls().map((call) => call[0]);
    expect(calledUrls).toHaveLength(nbApiCalls);
    expect(calledUrls).toContain(
      `https://joanie.endpoint/api/v1.0/organizations/${organization.id}/courses/?query=text+query&has_listed_course_runs=true&page=1&page_size=${perPage}`,
    );
    expect(calledUrls).toContain(
      `https://joanie.endpoint/api/v1.0/organizations/${organization.id}/offerings/?query=text+query&product_type=credential&page=1&page_size=${perPage}`,
    );

    await waitFor(() => {
      expect(screen.getAllByTestId('course-glimpse')).toHaveLength(10);
    });
  });
});
