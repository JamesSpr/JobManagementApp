
import React, { FC, ReactNode, useEffect, useRef } from "react"; 
import { Box, Button, CircularProgress, Portal, Snackbar, Alert } from "@mui/material";
import { useReactTable, getCoreRowModel, getPaginationRowModel, getFilteredRowModel, Table, RowData, ColumnDef,
    getFacetedRowModel, getFacetedUniqueValues, getFacetedMinMaxValues, getSortedRowModel, flexRender, Row } from '@tanstack/react-table'
import { HTMLElementChange, InputFieldType } from "../types/types";
import fuzzyFilter, { TableFilter } from "./FuzzyFilter";

export const InputField:FC<InputFieldType> = ({type="text", label, children, multiline=false, halfWidth=false, wide=false, width=0, error=false, noMargin=false, ...props}) => {

    const textareaRef = useRef<HTMLTextAreaElement>(document.createElement("txt") as HTMLTextAreaElement);
    useEffect(() => {
        if(textareaRef && multiline) {
            textareaRef.current.style.height = "0px";
            const scrollHeight = textareaRef.current.scrollHeight - 10;
            textareaRef.current.style.height = scrollHeight + "px";
        }
    }, [props.value])

    let boxStyle = "inputBox"

    let styleClass = "inputField";
    error ? styleClass += " inputFieldError" : '';

    // Custom styles
    if(width != 0) {
        boxStyle += ` width${width}`
        styleClass += " fullWidth";
    }

    if(noMargin) {
        boxStyle += ' no-margin'
    }
    if(halfWidth) {
        styleClass += " halfWidth";
    }
    else if(wide) {
        styleClass += " wideInput";
    }

    if(type == "date") {
        props = {...props, max: '9999-12-31'}
    }

    return (
        <>
            <div className={boxStyle} >
                {type === "select" ? 
                    <select className={styleClass} {...props} required>{children}</select> :
                    multiline ?
                        <textarea ref={textareaRef} className={styleClass} {...props} required/> :
                        <input className={styleClass} title="" type={type} {...props} required/> 
                    }
                <span className={error ? "floating-label inputFieldError" : "floating-label"}>{label}</span>
            </div>
        </>
    )
};

export const PaginationControls = <Type extends RowData>({table}: {table: Table<Type>}) => (
    table ? 
        <div className="pagination-controls" style={{paddingBottom: '5px'}}>
            <button
                style={{minWidth: '32px', width: '32px', height:'32px', }}
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
            >
                {'<<'}
            </button>
            <button
                style={{minWidth: '32px', width: '32px', height:'32px', marginLeft:'10px'}}
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
            >
                {'<'}
            </button>
            <button
                style={{minWidth: '32px', width: '32px', height:'32px', marginLeft:'10px', marginRight:'10px'}}
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
            >
                {'>'}
            </button>
            <button
                style={{minWidth: '32px', width: '32px', height:'32px'}}
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
            >
                {'>>'}
            </button>
            <span style={{paddingLeft: '5px', paddingRight: '5px'}}>
                Page
            </span>
            <strong>
                {table.getState().pagination.pageIndex + 1} of{' '}
                {table.getPageCount()}
            </strong>
            <span  style={{paddingLeft: '5px', paddingRight: '5px'}}>
                | Go to page:
                <InputField type="number" noMargin
                    defaultValue={table.getState().pagination.pageIndex + 1}
                    onChange={(event: React.ChangeEvent<HTMLElementChange>) => {
                        const page = event.target.value ? Number(event.target.value) - 1 : 0
                        table.setPageIndex(page)
                    }}
                    style={{width: '50px', marginLeft: '5px'}}
                />
            </span>
            <InputField type="select" noMargin
                value={table.getState().pagination.pageSize}
                onChange={(event: React.ChangeEvent<HTMLElementChange>) => table.setPageSize(Number(event.target.value))}
                style={{width: '100px'}}
            >
                {[10, 15, 20, 25, 30, 35, 40, 45, 50].map(pageSize => (
                    <option key={pageSize} value={pageSize}>
                        Show {pageSize}
                    </option>
                ))}
            </InputField>
        </div>
    : <></>
)

interface PaginatedTableType <T extends object> {
    data: T[]
    setData?: (arg0: any) => {}
    columns: ColumnDef<T>[]
    rowSelection?: {}
    setRowSelection?: () => {}
    columnFilters?: []
    setColumnFilters?: () => []
    globalFilter?: ''
    setGlobalFilter?: () => ''
    sorting?: []
    setSorting?: () => []
    rowStyles?: {}
}

function useSkipper() {
    const shouldSkipRef = React.useRef(true)
    const shouldSkip = shouldSkipRef.current
  
    // Wrap a function with this to skip a pagination reset temporarily
    const skip = React.useCallback(() => {
      shouldSkipRef.current = false
    }, [])
  
    React.useEffect(() => {
      shouldSkipRef.current = true
    })
  
    return [shouldSkip, skip] as const
}
  
declare module '@tanstack/react-table' {
    interface TableMeta<TData extends RowData> {
      updateData: (rowIndex: number, columnId: string, value: unknown) => void
    }
}

export const PaginatedTable = <T extends object>({data, setData, columns, columnFilters, setColumnFilters, globalFilter, setGlobalFilter, sorting, setSorting, rowStyles}: PaginatedTableType<T>) => {
    
    const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper()
    const table = useReactTable({
        data,
        columns,
        // Pipeline
        state: {
            columnFilters,
            globalFilter,
            sorting,
        },
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: getPaginationRowModel(),
        getFacetedUniqueValues: getFacetedUniqueValues(),
        getFacetedMinMaxValues: getFacetedMinMaxValues(),
        globalFilterFn: fuzzyFilter,
        enableMultiSort: true,
        autoResetPageIndex,
        // Provide our updateData function to our table meta
        meta: {
            updateData: (rowIndex: any, columnId: any, value: any) => {
                // Skip page index reset until after next rerender
                if(setData) {
                    skipAutoResetPageIndex()
                    setData((old: any) =>
                        old.map((row: any, index: any) => {
                        if (index === rowIndex) {
                            return {
                            ...old[rowIndex]!,
                            [columnId]: value,
                            }
                        }
                        return row
                        })
                    )
                }
            },
        },
    })

    return (
        <>
            <table style={{width: table.getTotalSize(), paddingBottom: '10px', margin: '0 auto'}}>
                <thead>
                    {table.getHeaderGroups().map(headerGroup => (
                        <tr key={headerGroup.id}>
                        {headerGroup.headers.map(header => {
                            return (
                                <th key={header.id} colSpan={header.colSpan} style={{width: header.getSize(), padding: '5px'}}>
                                    {header.isPlaceholder ? null : (
                                    <>
                                        <div {...{
                                            className: header.column.getCanSort()
                                            ? 'cursor-pointer select-none'
                                            : '',
                                            onClick: header.column.getToggleSortingHandler(),
                                        }}>
                                            {flexRender(
                                                header.column.columnDef.header,
                                                header.getContext()
                                            )}
                                            {{
                                                asc: ' ▲',
                                                desc: ' ▼',
                                            }[header.column.getIsSorted() as string] ?? null}
                                        </div>
                                        {header.column.getCanFilter() && columnFilters ? (
                                            <div>
                                                <TableFilter column={header.column} table={table} />
                                            </div>
                                        ) : null}
                                    </>
                                    )}
                                </th>
                            );
                        })}
                        </tr>
                    ))}
                </thead>
                <tbody>
                    {table.getRowModel().rows.map(row => {
                        return (
                            <tr key={row.id} 
                                style={{height: '20px'}}
                            >
                                {row.getVisibleCells().map(cell => {
                                    return (
                                        <td key={cell.id} style={{padding: '4px 5px'}}>
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
            
            <PaginationControls table={table} />
        </>
    )
}


export const SnackBar = ({snack, setSnack}: {snack: {active: boolean, variant: 'error' | 'info' | 'success' | 'warning' , message: string}, setSnack: React.Dispatch<React.SetStateAction<string>>}) => (
    <>
        <Portal>
            {/* Notification Snackbar */}
            <Snackbar
                anchorOrigin={{vertical: "bottom", horizontal:"center"}}
                open={snack['active']}
                autoHideDuration={12000}
                onClose={() => setSnack((prev: any) => ({...prev, 'active': false}))}
                >
                <Alert onClose={() => setSnack((prev: any) => ({...prev, 'active': false}))} severity={snack['variant']} sx={{width: '100%'}}>{snack['message']}</Alert>
            </Snackbar>
        </Portal>
    </>
)

export const FileUploadSection = ({onSubmit, waiting, id, type, button}: {onSubmit: () => void, waiting: {}, id: string, type: string, button: string}) => ( <>
    <input type="file" id={id} accept={type} className="fileUpload"/>
    <Box sx={{ m: 1, position: 'relative', display: 'flex', justifyContent: 'center' }}>
        <Button variant="outlined" onClick={onSubmit}>{button}</Button>
        {waiting && (
            <CircularProgress size={24} 
                sx={{
                    colour: 'primary', 
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    marginTop: '-12px',
                    marginLeft: '-12px',
                }}
            />
        )}
    </Box>
    </>
)

export const ProgressButton = ({name, waiting, onClick, centerButton=false, buttonVariant}: {name: string, waiting?: {}, onClick?: () => {}, centerButton?: boolean, buttonVariant?: "text" | "outlined" | "contained" }) => {
    let buttonStyle = "progressButton";
    if(centerButton) {
        buttonStyle += " centered";
    }

    return (
        <Box sx={{ m: 1, position: 'relative' }} className={buttonStyle}>
            <Button name={name.toLowerCase()} variant={buttonVariant} onClick={onClick}>{name}</Button>
            {waiting && (
                <CircularProgress size={24} 
                    sx={{
                        colour: 'primary', 
                        position: 'absolute',
                        top: '50%',
                        left: '50%',
                        marginTop: '-12px',
                        marginLeft: '-12px',
                    }}
                />
            )}
        </Box>
    )
}

export const Tooltip = ({children, title}: {children?: ReactNode, title?: string}) => {
    if(title !== "") {
        return(
        <div className="tooltip">
            {children}
            <span className="tooltiptext">{title}</span>
        </div>
    )}
    return (<>{children}</>)
}