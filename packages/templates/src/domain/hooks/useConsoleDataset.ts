import { useCallback, useState } from "react";
import { companies } from "../../console";
import type { CompanyDemo } from "../../console/types";
import {
  createConsoleRecord,
  deleteConsoleRecord,
  exportConsoleRecords,
  importConsoleRecords,
  resetConsoleCommand,
  transitionConsoleRecord,
  updateConsoleRecord,
} from "../services/legacyConsoleMutationService";

export function useConsoleDataset(initialDataset: CompanyDemo[] = companies) {
  const [companyDataset, replaceDataset] = useState(initialDataset);

  const createRecord = useCallback(
    (input: { companyId: string; pageId: string; moduleName: string; record: Record<string, unknown> }) => {
      const result = createConsoleRecord({ dataset: companyDataset, ...input });
      if (result) replaceDataset(result.dataset);
      return result;
    },
    [companyDataset],
  );

  const transitionRecord = useCallback(
    (input: { companyId: string; pageId: string; actionName: string; record: Record<string, unknown> }) => {
      const result = transitionConsoleRecord({ dataset: companyDataset, ...input });
      if (result) replaceDataset(result.dataset);
      return result;
    },
    [companyDataset],
  );

  const updateRecord = useCallback(
    (input: { companyId: string; pageId: string; record: Record<string, unknown>; patch: Record<string, string> }) => {
      const result = updateConsoleRecord({ dataset: companyDataset, ...input });
      if (result) replaceDataset(result.dataset);
      return result;
    },
    [companyDataset],
  );

  const importRecords = useCallback(
    (input: { companyId: string; pageId: string; records: Array<Record<string, unknown>> }) => {
      const result = importConsoleRecords({ dataset: companyDataset, ...input });
      if (result) replaceDataset(result.dataset);
      return result;
    },
    [companyDataset],
  );

  const exportRecords = useCallback(
    (input: { companyId: string; pageId: string; format: "csv" | "json" }) =>
      exportConsoleRecords({ dataset: companyDataset, ...input }),
    [companyDataset],
  );

  const deleteRecord = useCallback(
    (input: { companyId: string; pageId: string; record: Record<string, unknown> }) => {
      const result = deleteConsoleRecord({ dataset: companyDataset, ...input });
      if (result) replaceDataset(result.dataset);
      return result;
    },
    [companyDataset],
  );

  const resetData = useCallback((reason = "manual-reset") => {
    const result = resetConsoleCommand({ initialDataset, reason });
    replaceDataset(result.dataset);
    return result;
  }, [initialDataset]);

  return {
    companyDataset,
    createRecord,
    transitionRecord,
    updateRecord,
    importRecords,
    exportRecords,
    deleteRecord,
    resetData,
  };
}
