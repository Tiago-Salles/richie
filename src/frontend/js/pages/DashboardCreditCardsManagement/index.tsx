import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { useMemo } from 'react';
import { DashboardCard } from 'widgets/Dashboard/components/DashboardCard';
import { CreditCard } from 'types/Joanie';
import Banner, { BannerType } from 'components/Banner';
import { Spinner } from 'components/Spinner';
import { useCreditCardsManagement } from 'hooks/useCreditCardsManagement';
import { DashboardCreditCardBox } from './DashboardCreditCardBox';

const messages = defineMessages({
  header: {
    id: 'components.DashboardCreditCardsManagement.header',
    description: 'Title of the dashboard credit cards management block',
    defaultMessage: 'Credit cards',
  },
  errorCannotPromoteMain: {
    id: 'components.DashboardCreditCardsManagement.errorCannotPromoteMain',
    description: 'Error shown if a user tries to promote a main credit card',
    defaultMessage: 'Cannot promote main credit card.',
  },
  emptyList: {
    id: 'components.DashboardCreditCardsManagement.emptyList',
    description: 'Empty placeholder of the dashboard credit cards management block',
    defaultMessage: "You haven't created any credit cards yet.",
  },
});

interface Props {
  onClickEdit?: (creditCard: CreditCard) => void;
}

export const DashboardCreditCardsManagement = ({ onClickEdit }: Props) => {
  const intl = useIntl();
  const {
    states: { error, isPending },
    methods: { promote, safeDelete },
    ...creditCards
  } = useCreditCardsManagement();

  const sortByMainFirstThenByTitle = (a: CreditCard, b: CreditCard) => {
    if (a.is_main) {
      return -1;
    }
    if (b.is_main) {
      return 1;
    }
    if (!a.title) {
      return 1;
    }
    return a.title!.localeCompare(b.title ?? '', [intl.locale, intl.defaultLocale]);
  };

  const creditCardsList = useMemo(() => {
    return creditCards.items.sort(sortByMainFirstThenByTitle);
  }, [creditCards.items]);

  return (
    <DashboardCard header={<FormattedMessage {...messages.header} />}>
      <div className="dashboard-credit-cards">
        {isPending && <Spinner />}
        {!isPending && (
          <>
            {error && <Banner message={error} type={BannerType.ERROR} rounded />}
            {!error && creditCardsList.length === 0 && (
              <p className="dashboard-credit-cards__empty">
                <FormattedMessage {...messages.emptyList} />
              </p>
            )}
            {creditCardsList.map((creditCard) => (
              <DashboardCreditCardBox
                creditCard={creditCard}
                key={creditCard.id}
                edit={(_creditCard) => onClickEdit?.(_creditCard)}
                promote={({ id }) => promote(id)}
                remove={safeDelete}
              />
            ))}
          </>
        )}
      </div>
    </DashboardCard>
  );
};
