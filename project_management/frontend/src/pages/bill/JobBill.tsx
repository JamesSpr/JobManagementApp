import React, { useState, useMemo }  from 'react';
import { useReactTable, getCoreRowModel, flexRender, getSortedRowModel, getExpandedRowModel, ColumnDef, Row, ColumnSort, Table, Column} from '@tanstack/react-table'
import { Dialog, DialogContent, Grid, Typography, IconButton } from '@mui/material';
import { FileUploadSection, InputField, ProgressIconButton } from '../../components/Components';

// Icons
import CloseIcon from '@mui/icons-material/Close';
import RequestPageIcon from '@mui/icons-material/RequestPage';
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SaveIcon from '@mui/icons-material/Save';

import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { BillSummaryType, BillType, EstimateSummaryType, JobType, SnackType } from '../../types/types';
import { BillAttachmentType, SummariseBill } from './BillDialog';
import EditBill, { blankBill } from './EditBill';
import useAuth from '../auth/useAuth';

const BillHome = ({ open, handleClose, id, data, setJob, bills,  setNewBill, setCreateBill, setBillAttachment, setSnack }: {
    open: boolean,
    handleClose: (event?: {}, reason?: string) => void,
    id: string
    data: EstimateSummaryType[]
    setJob: React.Dispatch<React.SetStateAction<JobType>>
    bills: BillSummaryType[]
    setNewBill: React.Dispatch<React.SetStateAction<BillType>>
    setCreateBill: React.Dispatch<React.SetStateAction<boolean>>
    setBillAttachment: React.Dispatch<React.SetStateAction<BillAttachmentType>>
    setSnack: React.Dispatch<React.SetStateAction<SnackType>>
}) => {

    const { auth } = useAuth(); 
    const axiosPrivate = useAxiosPrivate();
    const [waiting, setWaiting] = useState({'create': false, 'update': false});
    const [advancedUpload, setAdvancedUpload] = useState(false);
    const [advancedUploadSettings, setAdvancedUploadSettings] = useState({numPages: 0});

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
        data,
        columns: estimateTableColumns,
        state: {
            expanded
        },
        onExpandedChange: setExpanded,
        getSubRows: row => row.subRows,
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
    });  

    const footerSum = (table: Table<BillSummaryType>, column: Column<BillSummaryType>) => {
        let sum = 0.0

        for(var i = 0; i < table.getRowModel().flatRows.length; i++) {
            if(table.getRowModel().flatRows[i].depth === 0) {
                sum += Number(table.getRowModel().flatRows[i].getValue(column.id))
            }
        }
        return sum
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
            minSize: 80,
            size: 80,
            maxSize: 80,
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
            minSize: 40,
            size: 40,
            maxSize: 40,
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

    const [editingBill, setEditingBill] = useState<BillType>(blankBill);
    const [billEditor, setBillEditor] = useState(false);
    const displayBill = (row: any) => {
        console.log(row)
        setEditingBill(row.original);
        setBillEditor(true);
    }

    const estimateTotal = () => {
        let totalAmount:number = 0.0;
        estimateTable.getRowModel().flatRows.forEach((row) => {
            if(row.depth === 0) {
                totalAmount += parseFloat(row.original.extension.toString());
            }
        })
        return totalAmount;
    }

    const estimateTotalIncProfit = () => {
        let totalAmount:number = 0.0;
        estimateTable.getRowModel().flatRows.forEach((row) => {
            if(row.depth === 0) {
                totalAmount += parseFloat(row.original.gross.toString());
            }
        })
        return totalAmount;
    }

    const billsTotal = () => {
        let totalAmount:number = 0.0;
        billsTable.getRowModel().flatRows.forEach((row) => {
            if(row.depth === 0) {
                totalAmount += parseFloat(row.original.amount.toString());
            }
        })
        return totalAmount / 1.1;
    }

    const getBudget = () => {
        return estimateTotal() - billsTotal();
    }
    const getProfit = () => {
        return estimateTotalIncProfit() - estimateTotal();
    }
    const getGross = () => {
        return getProfit() + getBudget();
    }

    const handleNewBill = () => {

        setWaiting(prev => ({...prev, 'create': true}));
        const target = document.getElementById('create_bill') as HTMLInputElement;
        const [file] = target?.files as FileList;

        if (!file) {
            setCreateBill(true);
            setWaiting(prev => ({...prev, 'create': false}));
            return;
        }

        let fileReader = new FileReader();
        fileReader.readAsDataURL(file)
        fileReader.onload = async () => {
            let data = fileReader.result

            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                query: `
                mutation extractBillDetails($file: String!, $filename: String!, $numPages: Int!) {
                    bill: extractBillDetails(file: $file, filename: $filename, numPages: $numPages) {
                        success
                        message
                        data
                        billFileName
                        billFileData
                    }
                }`,
                variables: { 
                    file: data,
                    filename: file.name,
                    numPages: advancedUploadSettings.numPages
                },
            }),
            }).then((response) => {
                // console.log(response);
                const res = response?.data?.data?.bill;
                setWaiting(prev => ({...prev, 'create': false}));
                if(res.success) {
                    // console.log(JSON.parse(res.data));
                    setNewBill(JSON.parse(res.data));
                    setBillAttachment({
                        'data': res.billFileData,
                        'name': res.billFileName
                    })
                    // setNewBill(prev => ({...prev, 'invoiceDate': new Date(prev?.invoiceDate)}))
                    setCreateBill(true);
                }
                else {
                    setSnack({active: true, variant: 'error', message: res.message})
                    setWaiting(prev => ({...prev, 'create': false}));
                }
            }).catch((err) => {
                setWaiting(prev => ({...prev, 'create': false}));
                console.log("Error", err)
                setSnack({active: true, variant: 'error', message: "Data Extraction Error. Contact Developer"})
            })
        }      
    }

    const [toggleSave, setToggleSave] = useState(false);

    return (
    <>
        <Dialog fullWidth maxWidth='md' scroll={'paper'} open={open} onClose={handleClose}>
            <span className="dialogTitle">
                
                {billEditor && <>
                    <IconButton onClick={() => setBillEditor(false)} disabled={waiting.update} style={{float: 'left', padding: '0px 0px 4px 0px'}}>
                        <ArrowBackIcon />
                    </IconButton>
                    <ProgressIconButton onClick={() => setToggleSave(true)} waiting={waiting.update} style={{float: 'left', padding: '0px 0px 4px 0px', margin: '0px 0px 0px 8px'}}>
                        <SaveIcon />
                    </ProgressIconButton>
                </>
                }
                <h1
                    style={{display: 'inline-block', position: 'relative', left: '24px', width: 'calc(100% - 104px)', textAlign: 'center', fontWeight: 'bold'}}>
                    Accounts for {id}
                </h1>
                <IconButton onClick={handleClose} disabled={waiting.update} style={{float: 'right', right: '10px', padding: '0px 0px 4px 0px'}} >
                    <CloseIcon />
                </IconButton>
            </span>
            <DialogContent>
                {billEditor ? 
                    <EditBill bills={editingBill} setJob={setJob} toggleSave={toggleSave} setToggleSave={setToggleSave} setEditing={setBillEditor} setUpdateWaiting={setWaiting}/>
                    :
                    <Grid container spacing={1} direction={'column'} alignItems={'center'} style={{overflow: 'auto hidden'}}>
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
                        <Grid item xs={12}>
                            <table className='accounts-table'>
                                <thead>
                                    <tr>
                                        <th>Budget</th>
                                        <th>Profit</th>
                                        <th>Gross</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td className={getBudget() == 0 ? '' : getBudget() > 0 ? 'withinBudget' : 'overBudget'}>{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(getBudget())}</td>
                                        <td className={getProfit() == 0 ? '' : getProfit() > 0 ? 'withinBudget' : 'overBudget'}>{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(getProfit())}</td>
                                        <td className={getGross() == 0 ? '' : getGross() > 0 ? 'withinBudget' : 'overBudget'}>{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(getGross())}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </Grid>
                        <Grid item xs={12}>
                            <div className='subheader-with-options'>
                                <p className='subHeader'>Upload New Bill</p>
                                <a className='options-link' onClick={() => setAdvancedUpload(!advancedUpload)}>Advanced Upload {advancedUpload ? "V" : ">"}</a>
                            </div>
                            { advancedUpload &&
                                <div className="bill-upload-options-container">
                                    <InputField type='number' step={1} min={0} label='Number of Pages'
                                        value={advancedUploadSettings.numPages} name="numPages"
                                        onChange={e => setAdvancedUploadSettings(prev => ({...prev, [e.target.name]: e.target.value}))} />
                                </div>
                            }
                            <FileUploadSection onSubmit={handleNewBill} waiting={waiting.create} id="create_bill" type=".pdf" button="Create New Bill"/>
                        </Grid>
                    </Grid>
                }
            </DialogContent>
        </Dialog>

    </>
    );
}



export default BillHome;

// export default () => ""