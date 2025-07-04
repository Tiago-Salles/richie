import { faker } from '@faker-js/faker';
import { render, screen } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { IntlProvider } from 'react-intl';
import { QueryClientProvider } from '@tanstack/react-query';
import fetchMock from 'fetch-mock';
import userEvent from '@testing-library/user-event';
import { CunninghamProvider } from '@openfun/cunningham-react';
import { RichieContextFactory as mockRichieContextFactory } from 'utils/test/factories/richie';
import JoanieApiProvider from 'contexts/JoanieApiContext';
import { createTestQueryClient } from 'utils/test/createTestQueryClient';
import SignOrganizationContractButton from '.';

jest.mock('utils/context', () => ({
  __esModule: true,
  default: mockRichieContextFactory({
    authentication: { backend: 'fonzie', endpoint: 'https://auth.test' },
    joanie_backend: { endpoint: 'https://joanie.test' },
  }).one(),
}));

describe('TeacherDashboardContractsLayout/SignOrganizationContractButton', () => {
  const Wrapper = ({ children }: PropsWithChildren) => {
    return (
      <CunninghamProvider>
        <IntlProvider locale="en">
          <QueryClientProvider client={createTestQueryClient({ user: true })}>
            <JoanieApiProvider>{children}</JoanieApiProvider>
          </QueryClientProvider>
        </IntlProvider>
      </CunninghamProvider>
    );
  };

  afterEach(() => {
    fetchMock.restore();
  });

  it('should display sign button user have some contract to sign', () => {
    render(
      <Wrapper>
        <SignOrganizationContractButton
          organizationId={faker.string.uuid()}
          contractToSignCount={12}
        />
      </Wrapper>,
    );

    expect(
      screen.getByRole('button', { name: 'Sign all pending contracts (12)' }),
    ).toBeInTheDocument();
  });

  it("shouldn't display sign button user don't have some contract to sign", () => {
    render(
      <Wrapper>
        <SignOrganizationContractButton
          organizationId={faker.string.uuid()}
          contractToSignCount={0}
        />
      </Wrapper>,
    );

    expect(
      screen.queryByRole('button', { name: /Sign all pending contracts/ }),
    ).not.toBeInTheDocument();
  });

  it.each([
    {
      label: "organization's contracts",
      organizationId: faker.string.uuid(),
      offeringIds: undefined,
    },
    {
      label: "organization's training contracts",
      organizationId: faker.string.uuid(),
      offeringIds: [faker.string.uuid()],
    },
  ])('should open $label frame on click', async ({ organizationId, offeringIds }) => {
    render(
      <Wrapper>
        <SignOrganizationContractButton
          organizationId={organizationId}
          offeringIds={offeringIds}
          contractToSignCount={12}
        />
      </Wrapper>,
    );

    const $button = screen.getByRole('button', { name: /Sign all pending contracts/ });
    const user = userEvent.setup();

    let getInvitationLinkUrl = `https://joanie.test/api/v1.0/organizations/${organizationId}/contracts-signature-link/`;
    if (offeringIds) {
      getInvitationLinkUrl += `?offering_ids=${offeringIds[0]}`;
    }

    fetchMock.get(getInvitationLinkUrl, {
      invitation_link: 'https://dummysignaturebackend.fr',
      contract_ids: [],
    });
    await user.click($button);

    expect(screen.getByTestId('dashboard-contract-frame')).toBeInTheDocument();
    expect(fetchMock.called(getInvitationLinkUrl)).toBe(true);
  });
});
