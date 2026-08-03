import { Fragment } from "react";
import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { measurementFieldCategoryOptions } from "@/lib/validations/measurement";

const CATEGORY_LABELS = Object.fromEntries(measurementFieldCategoryOptions.map((o) => [o.value, o.label]));

export interface ComparisonField {
  key: string;
  label: string;
  category: string;
}
export interface ComparisonColumn {
  id: string;
  label: string;
  values: Record<string, number>;
}

export function ComparisonTable({ fields, columns }: { fields: ComparisonField[]; columns: ComparisonColumn[] }) {
  const categories = Array.from(new Set(fields.map((f) => f.category)));

  return (
    <div className="overflow-x-auto rounded-2xl border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Measurement</TableHead>
            {columns.map((col) => (
              <TableHead key={col.id}>{col.label}</TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <Fragment key={category}>
              <TableRow className="bg-muted/40 hover:bg-muted/40">
                <TableCell colSpan={columns.length + 1} className="font-semibold text-foreground">
                  {CATEGORY_LABELS[category] ?? category}
                </TableCell>
              </TableRow>
              {fields
                .filter((f) => f.category === category)
                .map((field) => (
                  <TableRow key={field.key}>
                    <TableCell className="text-muted-foreground">{field.label}</TableCell>
                    {columns.map((col, i) => {
                      const value = col.values[field.key];
                      const prevValue = i > 0 ? columns[i - 1].values[field.key] : undefined;
                      const diff = prevValue !== undefined && value !== undefined ? value - prevValue : undefined;
                      return (
                        <TableCell key={col.id}>
                          <span className="font-medium text-foreground">{value ?? "N/A"}</span>
                          {diff !== undefined && diff !== 0 && (
                            <span className={`ml-1.5 inline-flex items-center text-xs ${diff > 0 ? "text-success" : "text-danger"}`}>
                              {diff > 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}
                              {Math.abs(diff)}
                            </span>
                          )}
                          {diff === 0 && <Minus className="ml-1.5 inline size-3 text-muted-foreground" />}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
            </Fragment>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
