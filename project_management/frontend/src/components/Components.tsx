
import React, { FC, ReactNode, useState, useEffect, useRef } from "react"; 
import { Box, Button, CircularProgress, Portal, Snackbar, Alert, AppBar, Toolbar, DialogTitle, DialogContent, Dialog, DialogActions, IconButton } from "@mui/material";
import { useReactTable, getCoreRowModel, getPaginationRowModel, getFilteredRowModel, Table as ReactTable, RowData, ColumnDef,
    getFacetedRowModel, getFacetedUniqueValues, getFacetedMinMaxValues, getSortedRowModel, flexRender, Row, TableMeta, SortingState, ColumnFiltersState } from '@tanstack/react-table'
import { HTMLElementChange, InputFieldType, RegionType, SnackBarType } from "../types/types";
import { fuzzyFilter, TableFilter } from "./TableHelpers";

declare module '@tanstack/react-table' {
    interface TableMeta<TData extends RowData> {
      updateData?: (rowIndex: string, columnId: keyof TData, value: any, row: Row<TData>) => void
      getRegions?: () => RegionType[]
      getStageDescription?: (value: string) => string
    }
}

export const InputField:FC<InputFieldType> = ({type="text", label, children, multiline=false, rows=0, halfWidth=false, wide=false, width=0, error=false, noMargin=false, ...props}) => {
    let boxStyle = "inputBox"
    let styleClass = "inputField";
    error ? styleClass += " inputFieldError" : '';

    const textareaRef = useRef<HTMLTextAreaElement>(document.createElement("txt") as HTMLTextAreaElement);
    if(rows === 0) {
        useEffect(() => {
            if(textareaRef && multiline) {
                textareaRef.current.style.height = "0px";
                const scrollHeight = textareaRef.current.scrollHeight - 10;
                textareaRef.current.style.height = scrollHeight + "px";
            }
        }, [props.value])
        styleClass += " resizeable"
    }

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
                    <select className={styleClass} {...props} placeholder=" " required>{children}</select> :
                    multiline ?
                        rows == 0 ?
                            <textarea ref={textareaRef} className={styleClass} {...props} placeholder=" " required/> 
                            :
                            <textarea rows={rows} className={styleClass} {...props} placeholder=" " required/> 
                        :
                        <input className={styleClass} title="" type={type} {...props} placeholder=" " required/> 
                    }
                <span className={error ? "floating-label inputFieldError" : "floating-label"}>{label}</span>
            </div>
        </>
    )
};

export const PaginationControls = <Type extends RowData>({table}: {table: ReactTable<Type>}) => (
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

interface TableType <T extends object> {
    data: T[]
    setData?: React.Dispatch<React.SetStateAction<any>>
    tableMeta?: TableMeta<any>
    columns: ColumnDef<T>[]
    rowSelection?: {}
    setRowSelection?: React.Dispatch<React.SetStateAction<any>>
    columnFilters?: ColumnFiltersState
    setColumnFilters?: React.Dispatch<React.SetStateAction<any>>
    globalFilter?: {}
    setGlobalFilter?: React.Dispatch<React.SetStateAction<string>>
    sorting?: SortingState
    setSorting?: React.Dispatch<React.SetStateAction<any>>
    columnVisibility?: {}
    rowStyles?: {}
    rowOnDoubleClick?: (row: any) => void
    autoResetPageIndex?: boolean
    skipAutoResetPageIndex?: () => void
    setUpdateRequired?: React.Dispatch<React.SetStateAction<boolean>>
    pagination?: boolean
    showFooter?: boolean
}

export const useSkipper = () => {
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

export const Table = <T extends object>({data, setData, tableMeta, columns, columnFilters, setColumnFilters, 
    rowSelection, setRowSelection, columnVisibility,
    globalFilter, setGlobalFilter, sorting, setSorting, rowOnDoubleClick,
    setUpdateRequired, autoResetPageIndex, skipAutoResetPageIndex, pagination, showFooter
}: TableType<T>) => {

    const [aRPI, skipARPI] = autoResetPageIndex === undefined || skipAutoResetPageIndex === undefined ? useSkipper() : [autoResetPageIndex, skipAutoResetPageIndex]

    const table = useReactTable({
        data,
        columns,
        state: {
            rowSelection: rowSelection ? rowSelection : '',
            columnFilters,
            globalFilter,
            sorting,
            columnVisibility,
        },
        onColumnFiltersChange: setColumnFilters,
        onGlobalFilterChange: setGlobalFilter,
        onRowSelectionChange: setRowSelection ? setRowSelection : undefined,
        onSortingChange: setSorting,
        getCoreRowModel: getCoreRowModel(),
        getSortedRowModel: getSortedRowModel(),
        getFacetedRowModel: getFacetedRowModel(),
        getFilteredRowModel: getFilteredRowModel(),
        getPaginationRowModel: pagination ? getPaginationRowModel() : undefined,
        getFacetedUniqueValues: getFacetedUniqueValues(),
        getFacetedMinMaxValues: getFacetedMinMaxValues(),
        globalFilterFn: fuzzyFilter,
        autoResetPageIndex: aRPI,
        enableMultiRowSelection: false,  
        enableMultiSort: true,
        // Provide our updateData function to our table meta
        meta: tableMeta ?? {
            updateData: (rowIndex: any, columnId: any, value: any) => {
                // Skip page index reset until after next rerender
                if(setData) {
                    if(setUpdateRequired !== undefined) {
                        setUpdateRequired(true);
                    } 
                    skipARPI()
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

    useEffect(()=> {if(pagination){table.setPageSize(15)}},[])

    if(!data || data.length === 0 ) {
        return (
            <table style={{width: table.getTotalSize(), paddingBottom: '10px', margin: '0 auto', maxWidth: '95%'}}>
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
                <tr>
                    <td colSpan={100}>
                        <p>No Data</p>
                    </td>
                </tr>
            </tbody>
            </table>
        )
    }

    return (
        <>
            <table style={{width: table.getTotalSize(), paddingBottom: '10px', margin: '0 auto', maxWidth: '95%'}}>
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
                                className={row.getIsSelected() ? "selectedRow" : ""}
                                style={{height: '20px'}}
                                onClick={(e) => {row.toggleSelected()}}
                                onDoubleClick={rowOnDoubleClick ? () => rowOnDoubleClick(row) : () => null}
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
                {showFooter &&
                    <tfoot>
                        {table.getFooterGroups().map(footerGroup => (
                            <tr key={footerGroup.id}>
                            {footerGroup.headers.map(header => (
                                <th key={header.id}>
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
                    </tfoot>}
            </table>
            
            { pagination && <PaginationControls table={table} /> }
        </>
    )
}

export const Footer = ({children}:{children: ReactNode}) => (
    <>
        <Box sx={{ flexGrow: 1}}>
            <AppBar position="fixed" sx={{ top:'auto', bottom: 0, zIndex: (theme) => theme.zIndex.drawer + 1 }}
            style={{height: '50px', backgroundColor: 'rgb(250,250,250)', boxShadow: 'rgb(0 0 0 / 10%) 0px 1px 1px -1px, rgb(0 0 0 / 10%) 0px 1px 1px 0px, rgb(0 0 0 / 10%) 0px 0 10px 2px'}}>
                <Toolbar style={{minHeight: '50px'}}>
                    <Box style={{margin: '0 auto'}}>
                        {children}
                    </Box>
                </Toolbar>
            </AppBar>
        </Box>
    </>
)

export const SnackBar:FC<SnackBarType> = ({snack, setSnack}) => (
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

export const ProgressButton = ({name, waiting, onClick, disabled, centerButton=false, buttonVariant}: 
{name: string, waiting?: boolean, onClick?: () => void, disabled?: boolean, centerButton?: boolean, buttonVariant?: "text" | "outlined" | "contained" }) => {
    let buttonStyle = "progressButton";
    if(centerButton) {
        buttonStyle += " centered";
    }

    return (
        <Box sx={{ m: 1, position: 'relative' }} className={buttonStyle}>
            <Button name={name.toLowerCase()} variant={buttonVariant} onClick={onClick} disabled={disabled ? disabled : waiting}>{name}</Button>
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

export const ProgressIconButton = ({waiting, onClick, children, disabled, style}: 
{waiting: boolean, onClick?: () => void, children: ReactNode, disabled?: boolean, style?: {} }) => {
    return (
        <Box sx={{display: 'inline-block'}}>
            <IconButton disabled={disabled ? disabled : waiting} onClick={onClick} style={style}>
                <Box sx={{position: 'relative', display: 'inline-block', width: '24px', height: '24px'}} >
                    {children}
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
            </IconButton>
        </Box>

        // <Box sx={{ m: 1, position: 'relative' }} className={buttonStyle}>
        //     <Button name={name.toLowerCase()} variant={buttonVariant} onClick={onClick} disabled={disabled ? disabled : waiting}>{name}</Button>
        //     {waiting && (
        //         <CircularProgress size={24} 
        //             sx={{
        //                 colour: 'primary', 
        //                 position: 'absolute',
        //                 top: '50%',
        //                 left: '50%',
        //                 marginTop: '-12px',
        //                 marginLeft: '-12px',
        //             }}
        //         />
        //     )}
        // </Box>
    )
}

export const Tooltip = ({children, title, arrow}: {children?: ReactNode, title?: string, arrow?: string}) => {
    if(title !== "") {
        return(
        <div className={`tooltip`}>
            {children}
            <span className={`tooltiptext ${arrow}`}>{title}</span>
        </div>
    )}
    return (<>{children}</>)
}

interface BasicDialogType {
    open: boolean
    close: () => void
    action: () => void
    waiting?: boolean
    title: string
    children?: ReactNode
    okay?: boolean
    fullWidth?: boolean
    maxWidth?: "xs" | "sm" | "md" | "lg" | "xl"
    center?: boolean
}

export const BasicDialog:FC<BasicDialogType> = ({open, close, action, waiting, title, center, children, okay, fullWidth, maxWidth}) => {

    return(<>
        <Dialog open={open} onClose={close} scroll={'paper'} fullWidth={fullWidth} maxWidth={maxWidth}>
                <DialogTitle textAlign={center ? 'center' : 'left'}>{title}</DialogTitle>
                <DialogContent dividers={true}>
                    {children}
                </DialogContent>
                <DialogActions style={{alignSelf: center ? "center" : "" }}>
                        {okay ? 
                            <Button onClick={action}>Okay</Button>
                            :
                        <>
                            {waiting ? 
                                <ProgressButton onClick={action} waiting={waiting} name="Yes"/>
                                : <Button onClick={action}>Yes</Button>
                            }
                            <Button onClick={close}>No</Button>
                        </>
                    }
                </DialogActions>
            </Dialog>
    </>)

}

export const DraggableDiv = ({children}: {children: ReactNode}) => {

}

interface AccordionType {
    title: string
    children?: ReactNode
}

export const Accordion:FC<AccordionType> = ({title, children}) => {

    const [active, setActive] = useState(false);

    const handleClick = () => {
        setActive(!active)
    }

    return (<>
        <button className={active ? "accordion accordion-active" : "accordion"} onClick={handleClick}>{title}</button>
        <div className={"accordion-panel"} style={{maxHeight: active ? "100%" : "0"}}>
            {children}
        </div>
    </>)

}