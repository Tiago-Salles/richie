import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router';
import useDefaultOrganizationId from 'hooks/useDefaultOrganizationId';
import { ContractResourceQuery, ContractState } from 'types/Joanie';

export type TeacherDashboardContractsParams = {
  organizationId?: string;
  offeringId?: string;
};

const useTeacherContractFilters = () => {
  const { offeringId } = useParams<TeacherDashboardContractsParams>();
  const [searchParams] = useSearchParams();
  const searchFilters: ContractResourceQuery = useMemo(() => {
    return {
      organization_id: searchParams.get('organization_id') || undefined,
      offering_id: searchParams.get('offering_id') || undefined,
      contract_ids: searchParams.getAll('contract_ids') || undefined,
      signature_state:
        (searchParams.get('signature_state') as ContractState) || ContractState.SIGNED,
    };
  }, Array.from(searchParams.entries()));

  // default orgnizationId between (ordered by priority): route, query, first user's organization.
  const defaultOrganizationId = useDefaultOrganizationId();

  const initialFilters = useMemo(() => {
    return {
      ...searchFilters,
      organization_id: defaultOrganizationId,
      offering_id: offeringId,
    };
  }, [defaultOrganizationId]);
  const [filters, setFilters] = useState<ContractResourceQuery>(initialFilters);

  // update current filter with initial value when it's ready
  useEffect(() => {
    setFilters(initialFilters);
  }, [initialFilters]);

  return { initialFilters, filters, setFilters };
};

export default useTeacherContractFilters;
