import { Button, Modal, ModalProps, ModalSize } from '@openfun/cunningham-react';
import { defineMessages, FormattedMessage, useIntl } from 'react-intl';
import { Address } from 'types/Joanie';
import { AddressFormValues, useDashboardAddressForm } from 'hooks/useDashboardAddressForm';
import { useAddressesManagement } from 'hooks/useAddressesManagement';
import { Spinner } from 'components/Spinner';
import Banner, { BannerType } from 'components/Banner';

const messages = defineMessages({
  title: {
    defaultMessage: 'Add address',
    description: 'Add address modal title.',
    id: 'components.SaleTunnel.AddressSelector.CreateAddressFormModal.title',
  },
  submit: {
    defaultMessage: 'Create',
    description: 'Submit button label.',
    id: 'components.SaleTunnel.AddressSelector.CreateAddressFormModal.submit',
  },
});

export interface AddressFormModalProps extends Pick<ModalProps, 'isOpen' | 'onClose'> {
  onSettled?: (address: Address) => void;
}

export const CreateAddressFormModal = (props: AddressFormModalProps) => {
  const intl = useIntl();
  const { FormView, handleSubmit, reset } = useDashboardAddressForm();
  const {
    methods: { create },
    states: { error, isPending },
  } = useAddressesManagement();

  const onSubmit = (data: AddressFormValues) => {
    create(data, {
      onSuccess: (newAddress) => {
        props.onSettled?.(newAddress);
        reset();
      },
    });
  };

  return (
    <Modal
      {...props}
      size={ModalSize.MEDIUM}
      title={intl.formatMessage(messages.title)}
      actions={
        <Button color="primary" size="small" onClick={handleSubmit(onSubmit)}>
          <FormattedMessage {...messages.submit} />
        </Button>
      }
    >
      <div className="address-select__form">
        {isPending && <Spinner />}
        {!isPending && (
          <div>
            {/*  Replace with alert */}
            {error && <Banner message={error} type={BannerType.ERROR} rounded />}
            {FormView}
          </div>
        )}
      </div>
    </Modal>
  );
};
