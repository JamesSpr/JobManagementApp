import React, { useMemo, useState } from "react";
import { BillSummaryType, BillType, EstimateSummaryType, ExpenseSummaryType, ExpenseType } from "../../../types/types";
import { Column, ColumnDef, ColumnSort, Row, Table, flexRender, getCoreRowModel, getExpandedRowModel, getSortedRowModel, useReactTable } from "@tanstack/react-table";
import { Grid, IconButton, Typography } from "@mui/material";
import RequestPageIcon from '@mui/icons-material/RequestPage';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';

export const EstimateSummaryTable = ({estimates}: {
    estimates: EstimateSummaryType[]
}) => {

    // Table Columns
    const estimateTableColumns = useMemo<ColumnDef<EstimateSummaryType>[]>(() => [
        {
            id: 'expander',
            size: 40,
            header: () => "",
            cell: ({ row }) => (
                <>
                    {row.getCanExpand() ? (
                        <IconButton onFocus={(e) => row.getIsSelected() ? null : row.toggleSelected()}
                        style={{padding: '0px 8px'}}
                        {...{
                            onClick: row.getToggleExpandedHandler(),
                        }}
                        >
                        {row.getIsExpanded() ? <ArrowDropDownIcon /> : <ArrowRightIcon />}
                        </IconButton>
                    ) : (
                        ''
                    )}
                </>
            )
        },
        {
            accessorKey: 'description',
            header: () => 'Description',
            size: 400,
        },
        {
            accessorKey: 'quantity',
            header: () => 'Quantity',
            size: 50,
        },
        {
            accessorKey: 'itemType',
            header: () => 'Units',
            size: 50,
        },
        {
            accessorKey: 'rate',
            header: () => 'Rate',
            cell: ({row, getValue}: {row: Row<EstimateSummaryType>, getValue: () => any}) => (
                <>
                    {row.getCanExpand() ? (
                        new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(getValue() / (row.original.subRows?.length ?? 1))
                    ): (
                        new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(getValue())
                    )}
            </>
            ),
            size: 75,
        },
        {
            accessorKey: 'extension',
            header: () => 'Amount',
            cell: ({getValue}: {getValue: () => any}) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(getValue()),
            size: 100,
        },
    ], []);

    const [expanded, setExpanded] = useState({})
    const estimateTable = useReactTable({
        data: estimates,
        columns: estimateTableColumns,
        state: {
            expanded
        },
        onExpandedChange: setExpanded,
        getSubRows: row => row.subRows,
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
    });  

    return (
        <Grid item xs={12} style={{margin: '10px 0px'}}>
            <Typography variant='h6' textAlign={'center'}>Approved Estimate Items</Typography>
            <table style={{width: estimateTable.getTotalSize()}}>
                <thead>
                    {estimateTable.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => {
                                return (
                                    <th key={header.id} colSpan={header.colSpan} style={{width: header.getSize(), padding: '5px'}}>
                                        {header.isPlaceholder ? null : (
                                        <>
                                            {flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                            )}
                                        </>
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {estimateTable.getRowModel().rows.map(row => {
                        return (
                            <tr key={row.id} style={{height: '20px'}}>
                                {row.getVisibleCells().map(cell => {
                                    return (
                                        <td key={cell.id} style={{background: row.depth === 0 ? "#fafafa" : '',padding: '4px 5px'}}>
                                            {
                                                flexRender(
                                                    cell.column.columnDef.cell,
                                                    cell.getContext()
                                                )
                                            }
                                        </td>
                                    );
                                })}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </Grid>
    )
}

export const BillSummaryTable = ({bills, setEditingObject, setEditing}: {
    bills: BillSummaryType[]
    setEditingObject: React.Dispatch<React.SetStateAction<BillType | ExpenseType | undefined>>
    setEditing: React.Dispatch<React.SetStateAction<"expense" | "bill" | null>>
}) => {

    const footerSum = (table: Table<BillSummaryType>, column: Column<BillSummaryType>) => {
        let sum = 0.0

        for(var i = 0; i < table.getRowModel().flatRows.length; i++) {
            if(table.getRowModel().flatRows[i].depth === 0) {
                sum += Number(table.getRowModel().flatRows[i].getValue(column.id))
            }
        }
        return sum
    }

    const displayBill = (row: any) => {
        setEditingObject(row.original);
        setEditing("bill");
    }

    const billTableColumns = useMemo<ColumnDef<BillSummaryType>[]>(() => [
        {
            id: 'expander',
            size: 40,
            header: () => "",
            cell: ({ row }) => (
                <>
                    {row.getCanExpand() ? (
                        <IconButton onFocus={(e) => row.getIsSelected() ? null : row.toggleSelected()}
                        style={{padding: '0px 8px'}}
                        {...{
                            onClick: row.getToggleExpandedHandler(),
                        }}
                        >
                        {row.getIsExpanded() ? <ArrowDropDownIcon /> : <ArrowRightIcon />}
                        </IconButton>
                    ) : (
                        ''
                    )}
                </>
            )
        },
        {
            id: 'supplier',
            accessorFn: row => row?.supplier?.name,
            header: () => 'Supplier',
            size: 400,
        },
        {
            accessorKey: 'invoiceNumber',
            header: () => 'Invoice #',
            size: 80,
        },
        {
            accessorKey: 'amount',
            header: () => 'Amount',
            cell: ({getValue}: {getValue: () => any}) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(getValue()/1.1),
            footer: ({table, column}) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(footerSum(table, column)/1.1),
            size: 100,
        },
        {
            accessorKey: 'invoiceDate',
            header: () => 'Invoice Date',
            cell: ({getValue}: {getValue: () => any}) => getValue() ? new Date(getValue()).toLocaleDateString('en-AU', {timeZone: 'UTC'}) : "",
            size: 100,
        },
        {
            accessorKey: 'processDate',
            header: () => 'Processed',
            cell: ({getValue}: {getValue: () => any}) => getValue() ? new Date(getValue()).toLocaleDateString('en-AU', {timeZone: 'UTC'}) : "",
            size: 80,
        },
        {
            accessorKey: 'thumbnailPath',
            header: () => 'Bill',
            cell: ({row}: {row: Row<BillSummaryType>}) => (
                row.parentId !== undefined &&
                <IconButton onClick={e => {displayBill(row)}}>
                    <RequestPageIcon />
                </IconButton>
            ),
            size: 40,
        },
    ], []);
    
    const [sorting, setSorting] = useState<ColumnSort[]>([{"id": "supplier", "desc": false}])
    const [expandedBills, setExpandedBills] = useState({})
    const billsTable = useReactTable({
        data: bills,
        columns: billTableColumns,
        state: {
            sorting,
            expanded: expandedBills
        },
        onExpandedChange: setExpandedBills,
        getSubRows: row => row.subRows,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
    }); 

    return (
        <Grid item xs={12} style={{margin: '10px 0px', overflow: 'auto hidden'}}>
            <Typography variant='h6' textAlign={'center'}>Bills</Typography>
            <table style={{width: billsTable.getTotalSize()}}>
                <thead>
                    {billsTable.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => {
                                return (
                                    <th key={header.id} colSpan={header.colSpan} style={{width: header.getSize(), padding: '5px'}}>
                                        {header.isPlaceholder ? null : (
                                        <>
                                            {flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                            )}
                                        </>
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {billsTable.getRowModel().rows.length > 0 ? (
                        billsTable.getRowModel().rows.map(row => {
                            return (
                                <tr key={row.id} style={{height: '20px'}}>
                                    {row.getVisibleCells().map(cell => {
                                        return (
                                            <td key={cell.id} style={{background: row.depth === 0 ? "#fafafa" : '', padding: '4px 5px'}}>
                                                {
                                                    flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext()
                                                    )
                                                }
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })) : (
                            <tr className="EmptyTableData" key={"NoQuote"}>
                                <td className="EmptyTableData" colSpan={8}>
                                    No Bills Found. Upload bills below.
                                </td>
                            </tr>
                        )
                    }
                </tbody>
                <tfoot>
                    {billsTable.getFooterGroups().map(footerGroup => (
                        <tr key={footerGroup.id}>
                        {footerGroup.headers.map(header => (
                            <th key={header.id} style={{padding: '4px 5px'}}>
                            {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.footer,
                                    header.getContext()
                                )}
                            </th>
                        ))}
                        </tr>
                    ))}
                </tfoot>
            </table>
        </Grid>
    )
}

export const ExpenseSummaryTable = ({expenses, setEditingObject, setEditing}: {
    expenses: ExpenseSummaryType[]
    setEditingObject: React.Dispatch<React.SetStateAction<BillType | ExpenseType | undefined>>
    setEditing: React.Dispatch<React.SetStateAction<"expense" | "bill" | null>>
}) => {

    const footerSum = (table: Table<ExpenseSummaryType>, column: Column<ExpenseSummaryType>) => {
        let sum = 0.0

        for(var i = 0; i < table.getRowModel().flatRows.length; i++) {
            if(table.getRowModel().flatRows[i].depth === 0) {
                sum += Number(table.getRowModel().flatRows[i].getValue(column.id))
            }
        }
        return sum
    }

    const displayExpense = (row: any) => {
        setEditingObject(row.original);
        setEditing("expense");
    }

    const expenseTableColumns = useMemo<ColumnDef<ExpenseSummaryType>[]>(() => [
        {
            id: 'expander',
            size: 40,
            header: () => "",
            cell: ({ row }) => (
                <>
                    {row.getCanExpand() ? (
                        <IconButton onFocus={(e) => row.getIsSelected() ? null : row.toggleSelected()}
                        style={{padding: '0px 8px'}}
                        {...{
                            onClick: row.getToggleExpandedHandler(),
                        }}
                        >
                        {row.getIsExpanded() ? <ArrowDropDownIcon /> : <ArrowRightIcon />}
                        </IconButton>
                    ) : (
                        ''
                    )}
                </>
            )
        },
        {
            accessorKey: 'vendor',
            header: () => 'Vendor',
            size: 280,
        },
        {
            accessorKey: 'locale',
            header: () => 'Locale',
            size: 200,
        },
        {
            accessorKey: 'amount',
            header: () => 'Amount',
            cell: ({getValue}: {getValue: () => any}) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(getValue()/1.1),
            footer: ({table, column}) => new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(footerSum(table, column)/1.1),
            size: 100,
        },
        {
            accessorKey: 'expenseDate',
            header: () => 'Expense Date',
            cell: ({getValue}: {getValue: () => any}) => getValue() ? new Date(getValue()).toLocaleDateString('en-AU', {timeZone: 'UTC'}) : "",
            size: 100,
        },
        {
            accessorKey: 'processDate',
            header: () => 'Processed',
            cell: ({getValue}: {getValue: () => any}) => getValue() ? new Date(getValue()).toLocaleDateString('en-AU', {timeZone: 'UTC'}) : "",
            size: 80,
        },
        {
            accessorKey: 'thumbnailPath',
            header: () => 'Expense',
            cell: ({row}: {row: Row<ExpenseSummaryType>}) => (
                row.parentId !== undefined &&
                <IconButton onClick={e => {displayExpense(row)}}>
                    <RequestPageIcon />
                </IconButton>
            ),
            size: 40,
        },
    ], []);
    
    const [sorting, setSorting] = useState<ColumnSort[]>([{"id": "supplier", "desc": false}])
    const [expandedExpenses, setExpandedExpenses] = useState({})
    const billsTable = useReactTable({
        data: expenses,
        columns: expenseTableColumns,
        state: {
            sorting,
            expanded: expandedExpenses
        },
        onExpandedChange: setExpandedExpenses,
        getSubRows: row => row.subRows,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
    }); 

    return (
        <Grid item xs={12} style={{margin: '10px 0px', overflow: 'auto hidden'}}>
            <Typography variant='h6' textAlign={'center'}>Expenses</Typography>
            <table style={{width: billsTable.getTotalSize()}}>
                <thead>
                    {billsTable.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                            {headerGroup.headers.map(header => {
                                return (
                                    <th key={header.id} colSpan={header.colSpan} style={{width: header.getSize(), padding: '5px'}}>
                                        {header.isPlaceholder ? null : (
                                        <>
                                            {flexRender(
                                            header.column.columnDef.header,
                                            header.getContext()
                                            )}
                                        </>
                                        )}
                                    </th>
                                );
                            })}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {billsTable.getRowModel().rows.length > 0 ? (
                        billsTable.getRowModel().rows.map(row => {
                            return (
                                <tr key={row.id} style={{height: '20px'}}>
                                    {row.getVisibleCells().map(cell => {
                                        return (
                                            <td key={cell.id} style={{background: row.depth === 0 ? "#fafafa" : '', padding: '4px 5px'}}>
                                                {
                                                    flexRender(
                                                        cell.column.columnDef.cell,
                                                        cell.getContext()
                                                    )
                                                }
                                            </td>
                                        );
                                    })}
                                </tr>
                            );
                        })) : (
                            <tr className="EmptyTableData" key={"NoQuote"}>
                                <td className="EmptyTableData" colSpan={8}>
                                    No Expenses Found. Upload expense below.
                                </td>
                            </tr>
                        )
                    }
                </tbody>
                <tfoot>
                    {billsTable.getFooterGroups().map(footerGroup => (
                        <tr key={footerGroup.id}>
                        {footerGroup.headers.map(header => (
                            <th key={header.id} style={{padding: '4px 5px'}}>
                            {header.isPlaceholder
                                ? null
                                : flexRender(
                                    header.column.columnDef.footer,
                                    header.getContext()
                                )}
                            </th>
                        ))}
                        </tr>
                    ))}
                </tfoot>
            </table>
        </Grid>
    )
}

export const JobBudgetSummary = ({estimate, bills, expenses}: {
    estimate: EstimateSummaryType[],
    bills: BillSummaryType[],
    expenses: ExpenseSummaryType[]
}) => {

    const estimateTotal: number = estimate.reduce((total, est) => {
        total += +est.extension
        return total
    }, 0.0);

    const estimateTotalIncProfit: number = estimate.reduce((total, est) => {
        total += +est.gross
        return total
    }, 0.0);

    const billsTotal: number = bills.reduce((total, bill) => {
        total += +bill.amount
        return total
    }, 0.0) / 1.1;

    const expensesTotal: number = expenses.reduce((total, expense) => {
        total += +expense.amount
        return total
    }, 0.0) / 1.1;

    const totalCost: number = expensesTotal + billsTotal;
    const totalProfit: number = estimateTotalIncProfit - estimateTotal;
    const totalGross: number = totalProfit + estimateTotal - totalCost;

    return (
        <Grid item xs={12}>
            <table className='accounts-table'>
                <thead>
                    <tr>
                        <th>Estimate</th>
                        <th>Costs</th>
                        <th>Profit</th>
                        <th>Remaining</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td className={estimateTotal == 0 ? '' : estimateTotal > 0 ? 'withinBudget' : 'overBudget'}>{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(estimateTotal)}</td>
                        <td className={totalProfit < estimateTotal ? '' : 'overBudget'}>{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(totalCost)}</td>
                        <td className={totalProfit == 0 ? '' : totalProfit > 0 ? 'withinBudget' : 'overBudget'}>{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(totalProfit)}</td>
                        <td className={totalGross <= totalProfit ? '' : totalGross > totalProfit ? 'withinBudget' : 'overBudget'}>{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(totalGross)}</td>
                    </tr>
                </tbody>
            </table>
        </Grid>
    )
}