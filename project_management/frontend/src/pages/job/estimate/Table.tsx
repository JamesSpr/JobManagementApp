import React, { useState, useEffect, useMemo, } from 'react';
import { useReactTable, getCoreRowModel, getExpandedRowModel, flexRender, Row, ColumnDef, } from '@tanstack/react-table'
import { Table, TableHead, TableBody, TableFooter, TableCell, TableRow, Grid, IconButton, } from '@mui/material';

import { produce } from 'immer';
import { BasicDialog, InputField, useSkipper } from '../../../components/Components';
import { EstimateHeaderType, EstimateType, JobType, SnackType } from '../../../types/types';
import useAxiosPrivate from '../../../hooks/useAxiosPrivate';

// Icons
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SettingsIcon from '@mui/icons-material/Settings';
import EstimateSettings from './EstimateSettings';

const EstimateTable = ({job, setJob, accessorId, setUpdateRequired, setSnack} : {
    job: JobType
    setJob: React.Dispatch<React.SetStateAction<JobType>>
    accessorId: number
    setUpdateRequired: React.Dispatch<React.SetStateAction<boolean>>
    setSnack: React.Dispatch<React.SetStateAction<SnackType>>
}) => {
    
    const axiosPrivate = useAxiosPrivate();

    const [expanded, setExpanded] = useState({});
    const [rowSelection, setRowSelection] = useState({});
    const [dialogTitle, setDialogTitle] = useState("");
    const [dialogMessage, setDialogMessage] = useState("");
    const [openAlert, setOpenAlert] = useState(false);
    const [dialogOkay, setDialogOkay] = useState(false);
    const [openSettings, setOpenSettings] = useState(false);

    interface DialogActionType {
        action: string
        row: Row<EstimateHeaderType> | null
    }
    const [dialogYesAction, setDialogYesAction] = useState<DialogActionType>({action: "", row: null});
    
    const EditableCell = ({ getValue, row, column: { id }, table }: 
        { getValue: any, row: any, column: { id: any }, table: any }) => {

        // For line items
        if (row.depth > 0){
            // We need to keep and update the state of the cell normally
            const initialValue = getValue();
            const [value, setValue] = useState(initialValue);

            const onFocus = (e: { target: { select: () => void; }; }) => {
                e.target.select();
            }
    
            const onChange = (e: { target: { value: any; }; }) => {
                setValue(e.target.value);
            } 
    
            // We'll only update the external data when the input is blurred
            const onBlur = (e: { target: { select: () => void; }; }) => {
                if(initialValue !== value) {
                    const val:number = parseFloat(value.toString())

                    // Table Calculations - Calculate values and update as required for each field
                    if(id === 'quantity') {
                        let extension = (val * row.getValue('rate'));
                        let gross = (extension * (1 + (row.getValue('markup') / 100)));
        
                        (table.options.meta).updateData(row.id, 'extension', extension, row);
                        (table.options.meta).updateData(row.id, 'gross', gross, row);
                    }
        
                    if(id === 'rate') {
                        let extension =  (val * row.getValue('quantity'));
                        let gross = (extension * (1 + (row.getValue('markup') / 100)));

                        (table.options.meta).updateData(row.id, 'extension', extension, row);
                        (table.options.meta).updateData(row.id, 'gross', gross, row);
                    }
        
                    if(id === 'extension'){
                        if(row.getValue('quantity') === '') {
                            let quantity = val / row.getValue('rate');
                            let gross = val * (1 + (row.getValue('markup') / 100));

                            (table.options.meta).updateData(row.id, 'quantity', quantity, row);
                            (table.options.meta).updateData(row.id, 'gross', gross, row);
                        }
                        else {
                            let rate = (val / row.getValue('quantity'));
                            let gross = (val * (1 + (row.getValue('markup') / 100)));
                            
                            (table.options.meta).updateData(row.id, 'rate', rate, row);
                            (table.options.meta).updateData(row.id, 'gross', gross, row);
                        }
                    }
        
                    if(id === 'markup') {
                        let gross = (row.getValue('extension') * (1 + (val / 100)));
                        (table.options.meta).updateData(row.id, 'gross', gross, row);
                    }
        
                    if(id === 'gross') {
                        let markup = (((val / row.getValue('extension')) - 1) * 100);
                        (table.options.meta).updateData(row.id, 'markup', markup, row);
                    }
        
                    // Update data with inputted value and recalculate header values
                    (table.options.meta).updateData(row.id, id, val, row);
                    setUpdateRequired(true);
                    // setValue(val.toFixed(2));
                }
            }
    
            // If the initialValue is changed external, sync it up with our state
            useEffect(() => {
                setValue(parseFloat(initialValue.toString()).toFixed(2));
            }, [initialValue])
    
            // If estimateset is approved then do not allow for editing of data
            if(job.estimateSet[accessorId].approvalDate) {
                switch(id) {
                    case 'markup':
                        return <p className='locked-estimate-line'>{value}%</p>
                    case 'rate':
                        return <p className='locked-estimate-line'>{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value)}</p>
                    case 'extension':
                        return <p className='locked-estimate-line'>{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value)}</p>
                    case 'gross':
                        return <p className='locked-estimate-line'>{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(value)}</p>
                    default:
                        return <p className='locked-estimate-line'>{value}</p>
                }
            }

            return (
                <input className="estimateTableInput" type="number" step="0.01" onFocus={onFocus} value={value} onChange={onChange} onBlur={onBlur} />
            );
        }

    
        if(id === 'markup') {
            return(
                getValue() ? <p style={{paddingLeft: '5px', margin: '0px'}}>{getValue().toFixed(2)}%</p> : <p style={{paddingLeft: '5px', margin: '0px'}}>0.00%</p> 
            );
        }
    
        if(id === 'gross') {
            return(
                getValue() ? <p style={{paddingLeft: '5px', margin: '0px'}}>{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(getValue())}</p> : <p style={{paddingLeft: '5px', margin: '0px'}}>$0.00</p> 
            );
        }

        return(null);
    }

    const SelectionCell = ({ getValue, row, column: { id }, table }: { 
        getValue: any, row: any, column: { id: any }, table: any }) => {

        // For line items
        if (row.depth > 0){
            // We need to keep and update the state of the cell normally
            const initialValue = getValue();
            const [value, setValue] = useState(initialValue);

            const onChange = (e: { target: { value: any; }; }) => {
                setValue(e.target.value);
            } 
        
            // If the initialValue is changed external, sync it up with our state
            useEffect(() => {
                setValue(initialValue);
            }, [initialValue])

            if(job.estimateSet[accessorId].approvalDate) {
                return <p className='locked-estimate-line'>{value}</p>
            }

            return (
                <select value={value} onChange={onChange} className="estimateTableInput"
                    onBlur={(e) => { 
                        if(initialValue !== value) {
                            table.options.meta.updateData(row.id, id, value, row);
                        }
                    }}
                >
                    <option key={"0"} value={''}>{''}</option>
                    <option key={"1"} value={'quote'}>quote</option>
                    <option key={"2"} value={'quantity'}>quantity</option>
                    <option key={"3"} value={'item'}>item</option>
                    <option key={"4"} value={'hours'}>hours</option>
                    <option key={"5"} value={'days'}>days</option>
                    <option key={"6"} value={'weeks'}>weeks</option>
                    <option key={"7"} value={'m'}>m</option>
                    <option key={"8"} value={'m2'}>m2</option>
                    <option key={"9"} value={'m3'}>m3</option>
                    <option key={"10"} value={'kg'}>kg</option>
                    <option key={"11"} value={'tonne'}>tonne</option>
                    <option key={"12"} value={'bag'}>bag</option>
                </select>
            );
        }
        return null
    }

    // Table Columns
    const columns = useMemo<ColumnDef<EstimateHeaderType>[]>(() => [
        {
            id: 'expander',
            minSize: 20,
            size: 40,
            maxSize: 40,
            header: ({table}) => (
                <IconButton 
                    {...{
                        onClick: table.getToggleAllRowsExpandedHandler(),
                    }}
                >
                    {table.getIsAllRowsExpanded() ? <ArrowDropDownIcon /> : <ArrowRightIcon />}
                </IconButton>
            ),
            cell: ({row}) => (
                <>
                    {/* <Checkbox checked={row.getIsSelected()} onChange={row.getToggleSelectedHandler()}/> */}
                    {row.getCanExpand() ? (
                        <IconButton onFocus={(e) => row.getIsSelected() ? null : row.toggleSelected()}
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
            header: 'Description',
            columns: [
                {
                    accessorKey: 'description',
                    header: () => 'Description',
                    minSize: 150,
                    size: 250,
                    maxSize: 300,
                    cell: ({ getValue, row, column: { id }, table }: 
                        { getValue: any, row: any, column: { id: any }, table: any }) => {
                        // We need to keep and update the state of the cell normally
                        const initialValue = getValue();
                        const [value, setValue] = useState(initialValue);
                
                        // We'll only update the external data when the input is blurred
                        const onBlur = () => {
                            if(value !== initialValue) {
                                table.options.meta.updateData(row.id, id, value as string, row);
                                setUpdateRequired(true);
                            }
                        }
                
                        const onChange = (e: { target: { value: any; }; }) => {
                            setValue(e.target.value);
                        }
                        
                        const onFocus = (e: { target: { select: () => void; }; }) => {
                            e.target.select();
                            row.getIsSelected() ? null : row.toggleSelected();
                        }

                        // If the initialValue is changed external, sync it up with our state
                        useEffect(() => {
                            setValue(initialValue);
                        }, [initialValue])

                        if(job.estimateSet[accessorId]['approvalDate']) {
                            return <p className='no-margin'>{value}</p>
                        }
                        
                        return (
                            <input className="estimateTableInput" value={value} onFocus={onFocus} onChange={onChange} onBlur={onBlur} />
                        );
                    },
                },
                {
                    accessorKey: 'quantity',
                    minSize: 100,
                    size: 200,
                    maxSize: 250,
                    header: () => 'Quantity',
                    cell: EditableCell,
                },
                {
                    accessorKey: 'itemType',
                    minSize: 100,
                    size: 200,
                    maxSize: 250,
                    header: () => 'Units',
                    cell: SelectionCell,
                },
                {
                    accessorKey: 'rate',
                    minSize: 100,
                    size: 200,
                    maxSize: 250,
                    header: () => 'Rate ($)',
                    cell: EditableCell,
                },
                {
                    accessorKey: 'extension',
                    minSize: 100,
                    size: 200,
                    maxSize: 250,
                    header: () => 'Extension ($)',
                    cell: EditableCell,
                },
            ]
        },
        {
            header: 'Markup Avg',
            columns: [
                {
                    accessorKey: 'markup',
                    minSize: 100,
                    size: 200,
                    maxSize: 250,
                    header: () => 'Markup (%)',
                    cell: EditableCell,
                },
            ]
        },
        {
            header: 'Gross',
            columns: [
                {
                    accessorKey: 'gross',
                    minSize: 100,
                    size: 200,
                    maxSize: 250,
                    header: () => 'Gross ($)',
                    cell: EditableCell,
                },
            ]
        },
        {
            id: "settings",
            header: () => <>
                <IconButton onClick={(e) => {setOpenSettings(true)}}>
                    <SettingsIcon />
                </IconButton>
            </>,
            columns: [
            {
                id: 'lineControls',
                size: 95,
                cell: ({row}) => (
                    <>
                        {!job.estimateSet[accessorId].approvalDate && (
                            row.depth !== 0 ? (
                            <>
                                <IconButton onClick={(e) => {handleNewItem(row)}}>
                                    <AddIcon />
                                </IconButton>
                                <IconButton onClick={(e) => {openDialog("DeleteLine", row)}}>
                                    <DeleteIcon />
                                </IconButton>
                            </>
                            ) : (
                                <>
                                    <IconButton onClick={(e) => {openDialog("DeleteHeader", row)}}>
                                        <DeleteIcon />
                                    </IconButton>
                                </>
                            )
                        )}
                    </>
                ),
            },
            ]
        }
    ], []);

    const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();

    const table = useReactTable({
        data: job.estimateSet[accessorId].estimateheaderSet,
        columns,
        state: {
            expanded,
            rowSelection,
        },
        onRowSelectionChange: setRowSelection,
        enableSubRowSelection: false,
        enableMultiRowSelection: false,
        onExpandedChange: setExpanded,
        getSubRows: (row, i) => row.estimateitemSet,
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        autoResetPageIndex,
        meta: {
            updateData: (rowIndex, columnId, value, row) => {
                skipAutoResetPageIndex();
                
                if(row.depth === 0) { // If line is header
                    setJob(prev => ({...prev, estimateSet: prev.estimateSet.map((estimate, index) => {
                        if(index === accessorId) {
                            const newEstimate = produce(prev.estimateSet[accessorId], draft => {
                                const idx = draft.estimateheaderSet.findIndex(header => header.id === row.original.id)
                                if(idx !== -1) {
                                    draft.estimateheaderSet[idx].description = value;
                                }
                            })
                            return newEstimate;
                        }
                        return estimate;
                    })}))
                }
                else { // When line is item
                    // Get Parent Row Id
                    const parentId:number = parseInt(row.parentId ?? row.id)
                    const numberItems = ['markup', 'extension', 'gross', 'rate', 'quantity']

                    // Update Data
                    setJob(prev => ({...prev, estimateSet: prev.estimateSet.map((estimate, index) => {
                        if(index === accessorId) {
                            const newEstimate = produce<EstimateType>(prev.estimateSet[accessorId], draft => {
                                const itemIdx = draft.estimateheaderSet[parentId].estimateitemSet.findIndex(item => item.id === row.original.id)
                                if(itemIdx !== -1) {

                                    if(numberItems.includes(columnId)) {
                                        (draft.estimateheaderSet[parentId].estimateitemSet[itemIdx] as any)[columnId] = value.toFixed(2);
                                    }
                                    else {
                                        (draft.estimateheaderSet[parentId].estimateitemSet[itemIdx] as any)[columnId] = value;
                                    }
                            
                                    // Recaculate Header Values
                                    let extension = 0;
                                    let markup = 0;
                                    let gross = 0;

                                    // Sum values
                                    for(let i = 0; i < prev.estimateSet[accessorId].estimateheaderSet[parentId].estimateitemSet.length; i++) {
                                        // If new value is entered into markup or gross, use that instead of previous value
                                        const item = prev.estimateSet[accessorId].estimateheaderSet[parentId].estimateitemSet[i]

                                        if(i === parseInt(rowIndex.split('.')[1])) {  
                                            if(columnId === 'markup') {
                                                extension += parseFloat(item.extension.toString());
                                                gross += parseFloat(item.gross.toString());
                                            }
                                            else if (columnId === 'extension') {
                                                gross += parseFloat(item.gross.toString());
                                                extension += parseFloat(value.toString());
                                            }
                                            else if (columnId === 'gross') {
                                                extension += item.extension;
                                                gross += parseFloat(value.toString());
                                            }
                                            else {
                                                extension += parseFloat(item.extension.toString());
                                                gross += parseFloat(item.gross.toString());
                                            }
                                        }
                                        else {
                                            gross += parseFloat(item.gross.toString());
                                            extension += parseFloat(item.extension.toString());
                                        }
                                    }

                                    // Average markup
                                    gross = isNaN(gross) ? 0 : gross
                                    markup = isNaN(gross / extension) ? 0 : ((gross / extension) - 1) * 100;

                                    draft.estimateheaderSet[parentId].markup = markup;
                                    draft.estimateheaderSet[parentId].gross = gross;
                                }
                              
                                draft.price = draft.estimateheaderSet.reduce((acc, val) => acc + val.gross, 0)
                            })

                            return newEstimate;
                        }
                        return estimate;
                    })}))
                }
            },
        },
        // debugTable: true,
        // debugHeaders: true,
        // debugColumns: true,
    });

    const handleNewHeader = async () => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation createEstimateHeader($estimateId:String!) {
                    create: createEstimateHeader(estimateId:$estimateId) {
                        success
                        estimateHeader{
                            id
                            description
                            markup
                            gross
                            estimateitemSet {
                                id
                                description
                                quantity
                                itemType
                                rate
                                extension
                                markup
                                gross
                            }
                        }
                    }
                }`,
                variables: {
                    estimateId: job.estimateSet[accessorId].id
                },
            })
        }).then((response) => {
            const res = response?.data?.data?.create
            // console.log(res)

            if(res?.success) {
                const newHeader = res.estimateHeader;
                setJob(prev => ({...prev, estimateSet: prev.estimateSet.map((estimate, index) => {
                    if(index === accessorId) {
                        const newEstimate = produce(prev.estimateSet[accessorId], draft => {
                            draft.estimateheaderSet.push(newHeader);
                        })
                        return newEstimate;
                    }
                    return estimate;
                })}))
            }
            else {
                setSnack({active: true, variant:'error', message: 'Error Creating Estimate Header'})
            }

        }).catch((err) => {
            console.log(err);
            setSnack({active: true, variant:'error', message: 'Error. Please contact Developer'})
        })
    }
    const handleDeleteHeader = async (row: Row<EstimateHeaderType>) => {
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation deleteEstimateHeader($headerId:String!) {
                    delete: deleteEstimateHeader(headerId:$headerId) {
                        success
                    }
                }`,
                variables: {
                    headerId: row.original.id
                },
            })
        }).then((response) => {
            const res = response?.data?.data?.delete
            // console.log(res)

            if(res?.success) {
                // Remove the line that got deleted
                setJob(prev => ({...prev, estimateSet: prev.estimateSet.map((estimate, index) => {
                    if(index === accessorId) {
                        const newEstimate = produce(prev.estimateSet[accessorId], draft => {
                            draft.estimateheaderSet = draft.estimateheaderSet.filter((header) => header.id !== row.original.id);
                        })
                        return newEstimate;
                    }
                    return estimate;
                })}))
            }
            else {
                setSnack({active: true, variant:'error', message: 'Error Creating Estimate'})
            }

        }).catch((err) => {
            console.log(err);
            setSnack({active: true, variant:'error', message: 'Error. Please contact Developer'})
        }).finally(() => {
            // Close the Dialog
            setOpenAlert(false);
            setDialogTitle("");
            setDialogMessage("");
            setDialogYesAction({action: "", row: null});
        }) 
    }

    const handleNewItem = async (row: Row<EstimateHeaderType>) => {

        // useMemo gets original job value, so we get the id from the table data
        const job = table.options.data
        const headerId = job[parseInt(row.parentId ?? '-1')].id

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation createEstimateItem($headerId:String!) {
                    create: createEstimateItem(headerId:$headerId) {
                        success
                        estimateItem {
                            id
                            description
                            quantity
                            itemType
                            rate
                            extension
                            markup
                            gross
                        }
                    }
                }`,
                variables: {
                    headerId: headerId
                },
            })
        }).then((response) => {
            const res = response?.data?.data?.create
            // console.log(res)

            if(res?.success) {
                const newItem = res.estimateItem;
                setJob(prev => ({...prev, estimateSet: prev.estimateSet.map((estimate, index) => {
                    if(index === accessorId) {
                        const newEstimate = produce(prev.estimateSet[accessorId], draft => {
                            const idx = draft.estimateheaderSet.findIndex(header => header.id === headerId)
                            if(idx !== -1) {
                                draft.estimateheaderSet[idx].estimateitemSet.push(newItem);
                            }
                        })
                        return newEstimate;
                    }
                    return estimate;
                })}))
            }
            else {
                setSnack({active: true, variant:'error', message: 'Error Creating Estimate Item'})
            }

        }).catch((err) => {
            console.log(err);
            setSnack({active: true, variant:'error', message: 'Error. Please contact Developer'})
        })
    }


    const handleDeleteItem = async (row: Row<EstimateHeaderType>) => {
        const headerId = job.estimateSet[accessorId].estimateheaderSet[parseInt(row.parentId ?? '-1')].id

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation deleteEstimateItem($itemId:String!) {
                    delete: deleteEstimateItem(itemId:$itemId) {
                        success
                    }
                }`,
                variables: {
                    itemId: row.original.id
                },
            })
        }).then((response) => {
            const res = response?.data?.data?.delete

            if(res?.success) {
                setJob(prev => ({...prev, estimateSet: prev.estimateSet.map((estimate, index) => {
                    
                    if(index === accessorId) {
                        const newEstimate = produce(prev.estimateSet[accessorId], draft => {
                            const idx = draft.estimateheaderSet.findIndex(header => header.id === headerId)
                            if(idx !== -1) {
                                draft.estimateheaderSet[idx].estimateitemSet = draft.estimateheaderSet[idx].estimateitemSet.filter((item) => item.id !== row.original.id);
                            }
                        })
                        return newEstimate;
                    }
                    return estimate;
                })}))
            }
            else {
                setSnack({active: true, variant:'error', message: 'Error Deleting Item'})
            }

        }).catch((err) => {
            console.log(err);
            setSnack({active: true, variant:'error', message: 'Error. Please contact Developer'})

        }).finally(() => {
            setDialogTitle("");
            setDialogMessage("");
            setDialogYesAction({action: "", row: null});
            setOpenAlert(false);
        })
    }

    // Dynamic Dialog Controls
    const openDialog = (dialogType: React.SetStateAction<string>, row: Row<EstimateHeaderType>) => {
        switch(dialogType) {
            case "DeleteLine":
                setDialogTitle("Delete Line");
                setDialogMessage("Are you sure you want to delete the selected line? This action will be permanent when saved.");
                setDialogYesAction({action: dialogType, row: row});
                setOpenAlert(true);
                break;
            case "DeleteHeader":
                setDialogTitle("Delete Header");
                setDialogMessage("Are you sure you want to delete the selected header and all items? This action will be permanent when saved.");
                setDialogYesAction({action: dialogType, row: row});
                setOpenAlert(true);
                break;
            default:
                setDialogTitle("Confirm Action");
                setDialogMessage("Are you sure you want to perform that action?");
                setOpenAlert(true);
                break;
        }
    }

    const dialogAction = ({action, row}: {action: string, row: Row<EstimateHeaderType> | null}) => {
        switch(action) {
            case "DeleteLine":
                if(row) handleDeleteItem(row);
                break;
            case "DeleteHeader":
                if(row) handleDeleteHeader(row);
                break;
            default: 
                // Close Dialog
                setOpenAlert(false);
                break;
        }
    }

    const updateScope = (e: { target: { value: any; }; }) => {
        setJob(prev => ({...prev, estimateSet:
            job.estimateSet.map((row, index) => {
            if(index === accessorId) {
                return {...row, scope: e.target.value}
            }
            return row;
        })}))
        setUpdateRequired(true);
    }

    // Calculate Total Values
    let totalExtension:number = 0;
    let totalAvgMarkup:number = 0;
    let totalGross:number = 0;
    let totalItems:number = 0;

    table.getRowModel().flatRows.forEach((row) => {
        if(row.depth === 0) {
            totalGross += typeof(row.original.gross) == "string" ? parseFloat(row.original.gross) ?? 0 : row.original.gross ?? 0;
            totalItems ++;
        }
        else {
            totalExtension += typeof(row.original.extension) == "string" ? parseFloat(row.original.extension) ?? 0 : row.original.extension ?? 0;
        }
    })

    totalAvgMarkup = isNaN(totalGross/totalExtension) ? 0 : ((totalGross/totalExtension) - 1) * 100;

    return (
        <Grid container direction={'column'} alignItems={'center'}>

            <InputField type="text" disabled={job.estimateSet[accessorId].approvalDate !== null} multiline width={1000} name="scope" label="Detailed Scope of Works" value={job.estimateSet[accessorId].scope} onChange={updateScope}/>
            <Table {...{sx: { width: table.getTotalSize(), maxWidth: '100%'},}}>
                <TableHead>
                    {table.getHeaderGroups().map(headerGroup => (
                        <TableRow key={"header_" + headerGroup.id}>
                        {headerGroup.headers.map(header => {
                            return (
                                <TableCell key={"header_cell_" + header.id} colSpan={header.colSpan} sx={{ width: header.getSize(), padding: '2px', fontWeight: 'bold', }}>
                                    {header.isPlaceholder ? null : (
                                    <>
                                        {flexRender(
                                        header.column.columnDef.header,
                                        header.getContext()
                                        )}
                                    </>
                                    )}
                                </TableCell>
                            );
                        })}
                        </TableRow>
                    ))}
                </TableHead>
                <TableBody>
                    {table.getRowModel().rows.map(row => {
                        return (
                            <TableRow key={"row_" + row.id} selected={row.getIsSelected()} onClick={(e) => {row.getIsSelected() ? null : row.toggleSelected()}} >
                                {row.getVisibleCells().map(cell => {
                                        {
                                            if(row.depth > 0 || cell.column.id === "markup" || cell.column.id === "gross" || cell.column.id === "expander" || cell.column.id === "lineControls"){
                                                return (
                                                    <TableCell key={"row_cell_" + cell.id} sx={{ background: row.depth === 0 && !row.getIsSelected() ? "#fafafa" : '', padding: '2px', width: cell.column.getSize()}} >
                                                    {
                                                        flexRender(
                                                            cell.column.columnDef.cell,
                                                            cell.getContext()
                                                        )
                                                    }
                                                    </TableCell>
                                                );
                                            }
                                            else if(cell.column.id === "description") {
                                                return (
                                                    <TableCell key={"row_cell_" + cell.id} 
                                                    sx={{ background: row.depth === 0 && !row.getIsSelected() ? "#fafafa" : '', padding: '2px', width: cell.column.getSize()}} 
                                                    colSpan={row.depth === 0 ? 5 : 1} >
                                                    {
                                                        flexRender(
                                                            cell.column.columnDef.cell,
                                                            cell.getContext()
                                                        )
                                                    }
                                                    </TableCell>
                                                );
                                            }
                                            return(null);
                                        }
                                })}
                            </TableRow>
                        );
                    })}
                </TableBody>
                <TableFooter>
                    <TableRow key={"footer"}>
                        <TableCell sx={{ height: '36px', padding: '2px'}} key={"footer_0"} colSpan={1}>
                            {!job.estimateSet[accessorId]['approvalDate'] && 
                                <IconButton onClick={handleNewHeader}>
                                    <AddIcon />
                                </IconButton>
                            }
                        </TableCell>
                        <TableCell sx={{ padding: '2px'}} key={"footer_1"} colSpan={4} >Items {totalItems}</TableCell>
                        <TableCell sx={{ padding: '2px', paddingLeft: '5px' }} key={"footer_2"} colSpan={1} >{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(totalExtension)}</TableCell>
                        <TableCell sx={{ padding: '2px', paddingLeft: '5px' }} key={"footer_3"} colSpan={1} >{totalAvgMarkup.toFixed(2) }%</TableCell>
                        <TableCell sx={{ padding: '2px', paddingLeft: '5px' }} key={"footer_4"} colSpan={1} >{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(totalGross)}</TableCell>
                        <TableCell sx={{ padding: '2px'}} key={"footer_5"} colSpan={1}>ID: {job.estimateSet[accessorId].id}</TableCell>
                    </TableRow>
                </TableFooter>
            </Table>

            {/* Alert Dialog */}
            <BasicDialog open={openAlert} close={() => setOpenAlert(false)} 
                title={dialogTitle} okay={dialogOkay} action={() => dialogAction(dialogYesAction)}
            >
                <p>{dialogMessage}</p>
            </BasicDialog>
            
            <BasicDialog open={openSettings} close={() => setOpenSettings(false)} title='Settings'
                okay action={() => setOpenSettings(false)}>
                <EstimateSettings setSnack={setSnack} setJob={setJob} estimate={job.estimateSet[accessorId].id} />
            </BasicDialog>
        </Grid>
    );
}

export default EstimateTable;
// export default () => '';