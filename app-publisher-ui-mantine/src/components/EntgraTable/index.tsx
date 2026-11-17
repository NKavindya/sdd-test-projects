import { Box, Group, Pagination, ScrollArea, Table } from "@mantine/core";
import { type ReactNode } from "react";
import { Busy, Empty } from "../index";
export function EntgraTable({
  columns,
  rows,
  loading,
  page,
  total,
  onPage,
}: {
  columns: string[];
  rows: ReactNode[];
  loading?: boolean;
  page?: number;
  total?: number;
  onPage?: (value: number) => void;
}) {
  return (
    <Box pos="relative">
      <ScrollArea>
        <Table
          verticalSpacing="md"
          horizontalSpacing="md"
          highlightOnHover
          className="entgra-table"
        >
          <Table.Thead>
            <Table.Tr>
              {columns.map((column, i) => (
                <Table.Th key={i}>{column}</Table.Th>
              ))}
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {loading ? (
              <Table.Tr>
                <Table.Td colSpan={columns.length}>
                  <Busy />
                </Table.Td>
              </Table.Tr>
            ) : rows.length ? (
              rows
            ) : (
              <Table.Tr>
                <Table.Td colSpan={columns.length}>
                  <Empty />
                </Table.Td>
              </Table.Tr>
            )}
          </Table.Tbody>
        </Table>
      </ScrollArea>
      {onPage && (
        <Group justify="flex-end" mt="lg">
          <Pagination
            value={page || 1}
            total={Math.max(1, total || 1)}
            onChange={onPage}
            size="sm"
          />
        </Group>
      )}
    </Box>
  );
}
