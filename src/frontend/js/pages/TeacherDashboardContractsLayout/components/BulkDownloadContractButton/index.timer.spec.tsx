import { faker } from '@faker-js/faker';
import { render, screen, waitFor } from '@testing-library/react';
import { IntlProvider } from 'react-intl';
import { PropsWithChildren } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { RichieContextFactory as mockRichieContextFactory } from 'utils/test/factories/richie';
import JoanieApiProvider from 'contexts/JoanieApiContext';
import { createTestQueryClient } from 'utils/test/createTestQueryClient';

import {
  LocalStorageArchiveFilters,
  getStoredContractArchiveId,
  storeContractArchiveId,
  unstoreContractArchiveId,
} from 'pages/TeacherDashboardContractsLayout/hooks/useDownloadContractArchive/contractArchiveLocalStorage';
import { CONTRACT_DOWNLOAD_SETTINGS } from 'settings';
import { OfferingFactory, OrganizationFactory } from 'utils/test/factories/joanie';
import BulkDownloadContractButton from '.';

jest.mock('utils/context', () => ({
  __esModule: true,
  default: mockRichieContextFactory({
    authentication: { backend: 'fonzie', endpoint: 'https://auth.test' },
    joanie_backend: { endpoint: 'https://joanie.test' },
  }).one(),
}));

let mockHasContractToDownload: boolean;
jest.mock('pages/TeacherDashboardContractsLayout/hooks/useHasContractToDownload/index.tsx', () => ({
  __esModule: true,
  default: () => mockHasContractToDownload,
}));

const mockCheckArchive = jest.fn();
const mockCreateArchive = jest.fn();
const mockGetArchive = jest.fn();
jest.mock('hooks/useContractArchive', () => ({
  __esModule: true,
  default: () => ({
    methods: { get: mockGetArchive, create: mockCreateArchive, check: mockCheckArchive },
  }),
}));

describe.each([
  {
    testLabel: 'for all organization and all trainings',
    organization: undefined,
    offering: undefined,
  },
  {
    testLabel: 'for a training in an organization',
    organization: OrganizationFactory().one(),
    offering: OfferingFactory().one(),
  },
  {
    testLabel: 'for an organization',
    organization: OrganizationFactory().one(),
    offering: undefined,
  },
  {
    testLabel: 'for a training',
    organization: undefined,
    offering: OfferingFactory().one(),
  },
])(
  'TeacherDashboardContractsLayout/BulkDownloadContractButton with fake timer, $testLabel',
  ({ organization, offering }) => {
    let localStorageArchiveFilters: LocalStorageArchiveFilters;

    const Wrapper = ({ children }: PropsWithChildren) => {
      return (
        <IntlProvider locale="en">
          <QueryClientProvider client={createTestQueryClient({ user: true })}>
            <JoanieApiProvider>{children}</JoanieApiProvider>
          </QueryClientProvider>
        </IntlProvider>
      );
    };

    let contractArchiveId: string;
    beforeEach(() => {
      localStorageArchiveFilters = {
        organizationId: organization ? organization.id : undefined,
        offeringId: offering ? offering.id : undefined,
      };
      mockHasContractToDownload = true;

      const now = Date.now();
      const unvalidCreationTime =
        now - CONTRACT_DOWNLOAD_SETTINGS.contractArchiveLocalVaklidityDurationMs * 2;

      jest.useFakeTimers();
      jest.setSystemTime(new Date(unvalidCreationTime));
      contractArchiveId = faker.string.uuid();
      storeContractArchiveId({ ...localStorageArchiveFilters, contractArchiveId });
      jest.setSystemTime(new Date(now));
    });

    afterEach(() => {
      jest.runOnlyPendingTimers();
      jest.useRealTimers();
      jest.clearAllMocks();
      unstoreContractArchiveId({
        organizationId: organization ? organization.id : undefined,
        offeringId: offering ? offering.id : undefined,
      });
    });

    it("should return IDLE status and clear stored id when archive doesn't exists on the server", async () => {
      mockHasContractToDownload = true;
      mockCheckArchive.mockResolvedValue(false);

      render(
        <Wrapper>
          <BulkDownloadContractButton
            organizationId={organization?.id ?? undefined}
            offeringId={offering?.id ?? undefined}
          />
        </Wrapper>,
      );

      const $downloadButton = screen.queryByRole('button', {
        name: /Download contracts archive/,
      });
      expect($downloadButton).toBeInTheDocument();

      // BulkDownloadButton is disabled until initiliazed
      expect($downloadButton).toBeDisabled();
      expect(mockCheckArchive).toHaveBeenCalledTimes(1);

      // Button should initalize with idle state and propose an archive generation
      await waitFor(() => {
        const $createArchiveButton = screen.queryByRole('button', {
          name: /Request contracts archive/,
        });
        expect($createArchiveButton).toBeInTheDocument();
        expect($createArchiveButton).toBeEnabled();
      });

      expect(getStoredContractArchiveId()).toBe(null);
      expect(mockGetArchive).not.toHaveBeenCalled();
      expect(mockCreateArchive).not.toHaveBeenCalled();

      // polling shouldn't start, mockCheckArchive shouldn't been called more than once
      expect(mockCheckArchive).toHaveBeenCalledTimes(1);
    });

    it('should return READY status when archive exists on the server', async () => {
      mockHasContractToDownload = true;
      mockCheckArchive.mockResolvedValue(true);

      render(
        <Wrapper>
          <BulkDownloadContractButton organizationId={organization?.id} offeringId={offering?.id} />
        </Wrapper>,
      );

      const $initButton = screen.queryByRole('button', {
        name: /Download contracts archive/,
      });
      expect($initButton).toBeInTheDocument();
      // BulkDownloadButton is disabled until initiliazed
      expect($initButton).toBeDisabled();
      expect(mockCheckArchive).toHaveBeenCalledTimes(1);

      await waitFor(() => {
        const $downloadButton = screen.queryByRole('button', {
          name: /Download contracts archive/,
        });
        expect($downloadButton).toBeInTheDocument();
        expect($downloadButton).toBeEnabled();
      });

      expect(getStoredContractArchiveId(localStorageArchiveFilters)).toBe(contractArchiveId);
      expect(mockGetArchive).not.toHaveBeenCalled();
      expect(mockCreateArchive).not.toHaveBeenCalled();

      // polling shouldn't start, mockCheckArchive shouldn't been called more than once
      expect(mockCheckArchive).toHaveBeenCalledTimes(1);
    });
  },
);
