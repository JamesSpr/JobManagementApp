import React, { useState, useEffect, useCallback, useRef, useMemo, } from 'react';
import { useReactTable, getCoreRowModel, getExpandedRowModel, flexRender, } from '@tanstack/react-table'
import { Table, TableHead, TableBody, TableFooter, TableCell, TableRow, TableContainer, 
    Button, IconButton, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, } from '@mui/material';

import useEstimate from './useEstimate';
import { produce } from 'immer';
import { usePrompt } from '../../../hooks/promptBlocker';

// Icons
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown';
import ArrowRightIcon from '@mui/icons-material/ArrowRight';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import SaveIcon from '@mui/icons-material/Save';

function useSkipper() {
    const shouldSkipRef = useRef(true)
    const shouldSkip = shouldSkipRef.current
  
    // Wrap a function with this to skip a pagination reset temporarily
    const skip = useCallback(() => {
      shouldSkipRef.current = false
    }, [])
  
    useEffect(() => {
      shouldSkipRef.current = true
    })

    return [shouldSkip, skip]
}

const EstimateTable = ({estimateData, accessorId}) => {

    // Intialise Data
    const [data, setData] = useState([]);

    useEffect(() => {
        setData(estimateData.estimateheaderSet);
    }, [])
    
    // useEffect(() => {
    //     setEstimateInfo(props.estimateData);
    // }, [props.estimate])

    // const [estimateInfo, setEstimateInfo] = useState({});
    
    const { setEstimateSet } = useEstimate(); 
    const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper();

    const [expanded, setExpanded] = useState({});
    const [rowSelection, setRowSelection] = useState({});
    const [dialogTitle, setDialogTitle] = useState("");
    const [dialogMessage, setDialogMessage] = useState("");
    const [openAlert, setOpenAlert] = useState(false);
    const [dialogOkay, setDialogOkay] = useState(false);
    const [dialogYesAction, setDialogYesAction] = useState('');
    
    const [saveRequired, setSaveRequired] = useState(false);

    // Navigation Blocker
    usePrompt('You have unsaved changes (quote). Are you sure you want to leave?', saveRequired);

    const EditableCell = ({ getValue, row, column: { id }, table }) => {
        if (row.depth > 0){
            // We need to keep and update the state of the cell normally
            const initialValue = getValue();
            const [value, setValue] = useState(initialValue);

            const onFocus = (e) => {
                e.target.select();
            }
    
            const onChange = (e) => {
                setValue(e.target.value);
            } 
    
            // We'll only update the external data when the input is blurred
            const onBlur = () => {
                // Table Calculations - Calculate values and update as required for each field
                if(id === 'quantity') {
                    let extension = (value * row.getValue('rate')).toFixed(2);
                    isNaN(extension) ? extension = "0.00" : null;
                    let gross = (extension * (1 + (row.getValue('markup') / 100))).toFixed(2);
                    isNaN(gross) ? gross = "0.00" : null;
    
                    (table.options.meta).updateData(row, 'extension', parseFloat(extension).toFixed(2));
                    (table.options.meta).updateData(row, 'gross', parseFloat(gross).toFixed(2));
                }
    
                if(id === 'rate') {
                    let extension =  (value * row.getValue('quantity')).toFixed(2);
                    isNaN(extension) ? extension = "0.00" : null;
                    let gross = (extension * (1 + (row.getValue('markup') / 100))).toFixed(2);
                    isNaN(gross) ? gross = "0.00" : null;

                    ;(table.options.meta).updateData(row, 'extension', parseFloat(extension).toFixed(2));
                    ;(table.options.meta).updateData(row, 'gross', parseFloat(gross).toFixed(2));
                }
    
                if(id === 'extension'){
                    if(row.getValue('quantity') === '') {
                        let quantity = (value / row.getValue('rate')).toFixed(2);
                        isNaN(quantity) ? quantity = "0.00" : null;
                        let gross = (value * (1 + (row.getValue('markup') / 100))).toFixed(2);
                        isNaN(gross) ? gross = "0.00" : null;

                        ;(table.options.meta).updateData(row, 'quantity', parseFloat(quantity).toFixed(2));
                        ;(table.options.meta).updateData(row, 'gross', parseFloat(gross).toFixed(2));
                    }
                    else {
                        let rate = (value / row.getValue('quantity')).toFixed(2);
                        isNaN(rate) ? rate = "0.00" : null;
                        let gross = (value * (1 + (row.getValue('markup') / 100))).toFixed(2);
                        isNaN(gross) ? gross = "0.00" : null;
                        
                        ;(table.options.meta).updateData(row, 'rate', parseFloat(rate).toFixed(2));
                        ;(table.options.meta).updateData(row, 'gross', parseFloat(gross).toFixed(2));
                    }
                }
    
                if(id === 'markup') {
                    let gross = (row.getValue('extension') * (1 + (value / 100))).toFixed(2);
                    isNaN(gross) ? gross = "0.00" : null;
                    ;(table.options.meta).updateData(row, 'gross', parseFloat(gross).toFixed(2));
                }
    
                if(id === 'gross') {
                    let markup = (((value / row.getValue('extension')) - 1) * 100).toFixed(2);
                    isNaN(markup) ? markup = "0.00" : null;
                    ;(table.options.meta).updateData(row, 'markup', parseFloat(markup).toFixed(2));
                }
    
                // Update data with inputted value and recalculate header values
                (table.options.meta).updateData(row, id, parseFloat(value).toFixed(2));
                setSaveRequired(true);
            }
    
            // If the initialValue is changed external, sync it up with our state
            useEffect(() => {
                setValue(initialValue);
            }, [initialValue])
    
            if(estimateData['approvalDate']) {
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
    
            if(id === 'itemType') {
                return (
                    <select value={value} onChange={onChange} className="estimateTableInput"
                        onBlur={(e) => { table.options.meta.updateData(row, id, value);}}
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

            return (
                <input className="estimateTableInput" type="number" step="0.01" onFocus={onFocus} value={value} onChange={onChange} onBlur={onBlur} />
            );
        }
    
        if(id === 'markup') {
            return(
                getValue() ? <p style={{paddingLeft: '5px', margin: '0px'}}>{getValue()}%</p> : ''
            );
        }
    
        if(id === 'gross') {
            return(
                getValue() ? <p style={{paddingLeft: '5px', margin: '0px'}}>{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(getValue())}</p> : ''
            );
        }

        return(null);
    
    }

    // Table Columns
    const columns = useMemo(() => [
        {
            id: 'expander',
            minSize: 20,
            size: 40,
            maxSize: 40,
            header: ({ table }) => (
                <IconButton 
                    {...{
                        onClick: table.getToggleAllRowsExpandedHandler(),
                    }}
                >
                    {table.getIsAllRowsExpanded() ? <ArrowDropDownIcon /> : <ArrowRightIcon />}
                </IconButton>
            ),
            cell: ({ row }) => (
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
                    cell: ({ getValue, row, column: { id }, table }) => {
                        // We need to keep and update the state of the cell normally
                        const initialValue = getValue();
                        const [value, setValue] = useState(initialValue);
                
                        // We'll only update the external data when the input is blurred
                        const onBlur = () => {
                            table.options.meta.updateData(row, id, value);
                            setSaveRequired(true);
                        }
                
                        const onChange = (e) => {
                            setValue(e.target.value);
                        }
                        
                        const onFocus = (e) => {
                            e.target.select();
                            row.getIsSelected() ? null : row.toggleSelected();
                        }

                        // If the initialValue is changed external, sync it up with our state
                        useEffect(() => {
                            setValue(initialValue);
                        }, [initialValue])

                        if(estimateData['approvalDate']) {
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
                    cell: EditableCell,
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
            header: '',
            columns: [
                {
                    id: 'lineControls',
                    minSize: 80,
                    size: 90,
                    maxSize: 90,
                    header: ({table}) => (
                        <>
                            {!estimateData['approvalDate'] && 
                                <IconButton onClick={(e) => {
                                    handleSaveEstimate(table.options.data);
                                }}> 
                                    <SaveIcon />
                                </IconButton>
                            }
                        </>
                    ),
                    cell: ({row}) => (
                        <>
                            {!estimateData['approvalDate'] && (
                                row.depth !== 0 ? (
                                <>
                                    <IconButton onClick={(e) => {handleNewLine(row)}}>
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

    const table = useReactTable({
        data,
        columns,
        state: {
            expanded,
            rowSelection,
        },
        onRowSelectionChange: setRowSelection,
        enableSubRowSelection: false,
        enableMultiRowSelection: false,
        onExpandedChange: setExpanded,
        getSubRows: (row) => row.subRows,
        getCoreRowModel: getCoreRowModel(),
        getExpandedRowModel: getExpandedRowModel(),
        autoResetPageIndex,
        meta: {
            updateData: (Row, columnId, value) => {
                skipAutoResetPageIndex();
                
                if(Row.original?.subRows) { // If line is header
                    setData(old => old.map((row, index) => {
                        if (index === Row.index) {
                            const newHeader = produce(old[Row.index], draft => {
                                draft[columnId] = value;
                            })
                            return newHeader;
                        }
                        return row;
                    }))
                }
                else { // When line is item
                    // Get Parent Row Id
                    const parentId = parseInt(Row.id.split(".")[0])

                    // // Update Data
                    setData(old => old.map((row, index) => {
                        if (index === parentId) {
                            const newLineItem = old[parentId].subRows.map((row1, index1) => {
                                if(index1 === Row.index) {
                                    const newEstimateItem = produce(old[parentId].subRows[index1], draft => {
                                        draft[columnId] = value;
                                    })
                                    return newEstimateItem;
                                }
                                return row1;
                            })
                            if(newLineItem) {
                                // Recaculate Header Values
                                let extension = 0.0;
                                let markup = 0.0;
                                let gross = 0.0;

                                //  Sum values
                                for(let i = 0; i < old[parentId].subRows.length; i++) {
                                    // If new value is entered into markup or gross, use that instead of previous value
                                    if(i == Row.index) {  
                                        if(columnId === 'markup') {
                                            // markup += parseFloat(value);
                                            extension += parseFloat(old[parentId].subRows[i].extension);
                                            gross += parseFloat(old[parentId].subRows[i].gross);
                                        }
                                        else if (columnId === 'extension') {
                                            // markup += parseFloat(old[parentId].subRows[i].markup);
                                            extension += parseFloat(value);
                                            gross += parseFloat(old[parentId].subRows[i].gross);
                                        }
                                        else if (columnId === 'gross') {
                                            // markup += parseFloat(old[parentId].subRows[i].markup);
                                            extension += parseFloat(old[parentId].subRows[i].extension);
                                            gross += parseFloat(value);
                                        }
                                        else {
                                            // markup += parseFloat(old[parentId].subRows[i].markup);
                                            extension += parseFloat(old[parentId].subRows[i].extension);
                                            gross += parseFloat(old[parentId].subRows[i].gross);
                                        }
                                    }
                                    else {
                                        // markup += parseFloat(old[parentId].subRows[i].markup);
                                        gross += parseFloat(old[parentId].subRows[i].gross);
                                        extension += parseFloat(old[parentId].subRows[i].extension);
                                    }
                                }


                                // Average markup
                                markup = (gross / extension - 1) * 100;

                                const newEstimateHeader = produce(old[parentId], draft => {
                                    draft.markup = markup.toFixed(2);
                                    draft.gross = gross.toFixed(2);
                                    draft.subRows = newLineItem;
                                })
                                return(newEstimateHeader);
                            }
                        }
                        return row;
                    }))
                }

                
            },
        },
        // debugTable: true,
        // debugHeaders: true,
        // debugColumns: true,
    });

    // Calculate Total Values
    let totalExtension = 0.0;
    let totalAvgMarkup = 0.0;
    let totalGross = 0.0;
    let totalItems = 0;

    table.getRowModel().flatRows.forEach((row) => {
        if(row.depth === 0) { 
            totalAvgMarkup += parseFloat(row.original['markup']);
            totalGross += parseFloat(row.original['gross']);
            totalItems ++;
        }
        else {
            totalExtension += parseFloat(row.original['extension']);
        }
    })
    totalAvgMarkup = totalAvgMarkup / totalItems;

    const handleNewHeader = () => {
        const newId = (data.length ?? 0) + 1;

        const newHeader = {id: newId.toString(), description: "", markup: "0.00", gross: "0.00", 
            subRows: [{id:"0", description: "", quantity: "0.00", itemType: "", rate: "0.00", extension: "0.00", markup: "0.00", gross: "0.00"}]};

        setData(old => [...old, newHeader]);
    }

    const handleNewLine = (onRow) => {

        let headerIndex = onRow ? parseInt(onRow.id.split('.')[0]) : parseInt(Object.keys(rowSelection)[0]?.split('.')[0] ?? "-1");
        let lineIndex = onRow ? parseInt(onRow.id.split('.')[1]) + 1 : parseInt(Object.keys(rowSelection)[0]?.split('.')[1] ?? "-1") + 1;

        if(headerIndex !== -1 && lineIndex !== -1) {
            const newLine = {id:"0", description: "", quantity: "0.00", itemType: "", rate: "0.00", extension: "0.00", markup: "0.00", gross: "0.00"};

            // Expand the header row if a new line is added to it
            table.getRowModel().flatRows.map(row => {
                if(row.id === headerIndex.toString()) 
                    row.getIsExpanded() ? null : row.toggleExpanded();
                }
            )

            setData(old => old.map((row, index) => {
                if (index === headerIndex) {
                    const newEstimateHeader = produce(old[headerIndex], draft => {
                        draft.subRows.splice(lineIndex, 0, newLine);
                    })
                    return(newEstimateHeader);
                }
                return row;
            }))
        }
    }

    const handleDeleteHeader = () => {
        // Split rowSelection key to extract header and line index
        let headerIndex = parseInt(Object.keys(rowSelection)[0]?.split('.')[0] ?? "-1");
        let lineIndex = parseInt(Object.keys(rowSelection)[0]?.split('.')[1] ?? "-1");

        if(lineIndex < 0 && headerIndex >= 0) {
            setOpenAlert(false);
            let newEstimateHeaders = [];
            setData(old => {
                newEstimateHeaders = [];
                for(let i = 0; i < old.length; i++) {
                    if(i !== headerIndex) {
                        newEstimateHeaders.push(old[i]);
                    }
                }
                return newEstimateHeaders;
            })
            setDialogTitle("");
            setDialogMessage("");
            setDialogYesAction();
        }
        else {
            setDialogOkay(true);
            setDialogTitle("Header Not Selected");
            setDialogMessage("Please ensure the header you wish to delete is selected.");
        }
    }

    const handleDeleteLine = (onRow) => {
        // Split rowSelection key to extract header and line index
        let headerIndex = onRow ? parseInt(onRow.id.split('.')[0]) : parseInt(Object.keys(rowSelection)[0]?.split('.')[0] ?? "-1");
        let lineIndex = onRow ? parseInt(onRow.id.split('.')[1]) + 1 : parseInt(Object.keys(rowSelection)[0]?.split('.')[1] ?? "-1");

        if(lineIndex >= 0) {
            setData(old => old.map((row, index) => {
                if (index === headerIndex) {
                    const newEstimateHeader = produce(old[headerIndex], draft => {
                        draft.gross = draft.gross - draft.subRows[lineIndex].gross;
                        draft.markup = draft.markup - draft.subRows[lineIndex].markup;
                        draft.subRows.splice(lineIndex, 1);
                    })
                    return(newEstimateHeader);
                }
                return row;
            }))
            setDialogTitle("");
            setDialogMessage("");
            setDialogYesAction();
            setOpenAlert(false);
        }
        else {
            setDialogOkay(true);
            setDialogTitle("Line Item Not Selected");
            setDialogMessage("Please ensure the line item you wish to delete is selected.");
        }
    }

    // Dynamic Dialog Controls
    const openDialog = (dialogType, row) => {
        switch(dialogType) {
            case "DeleteLine":
                setDialogTitle("Delete Line");
                setDialogMessage("Are you sure you want to delete the selected line? This action will be permanent when saved.");
                setDialogYesAction(dialogType, row);
                setOpenAlert(true);
                break;
            case "DeleteHeader":
                setDialogTitle("Delete Header");
                setDialogMessage("Are you sure you want to delete the selected header and all items? This action will be permanent when saved.");
                setDialogYesAction(dialogType, row);
                setOpenAlert(true);
                break;
            default:
                setDialogTitle("Confirm Action");
                setDialogMessage("Are you sure you want to perform that action?");
                setOpenAlert(true);
                break;
        }
    }

    const dialogAction = (action, row) => {
        switch(action) {
            case "DeleteLine":
                handleDeleteLine(row);
                break;
            case "DeleteHeader":
                handleDeleteHeader(row);
                break;
            default: 
                // Close Dialog
                setOpenAlert(false);
                break;
        }
    }

    const handleSaveEstimate = (tableData) => {
        // Calculate sum of child elements
        let estimateSum = 0.00;
        tableData.map(item => {
            estimateSum += parseFloat(item.gross);
        })

        // Update the current estimateSet
        setEstimateSet(prev => prev.map((row, index) => {
            if(index === accessorId) {
                const savedEstimateOption = produce(prev[index], draft => {
                    draft.price = estimateSum.toFixed(2);
                    draft.estimateheaderSet = tableData;
                })
                return savedEstimateOption;
            }
            return row;
        }));

        setSaveRequired(false);
    }

    // const handleSaveSettings = async () => {
    //     // console.log("EstimateInfo", estimateInfo);
    //     setEstimateSet(prev => prev.map((row, index) => {
    //         if(index === props.accessorId) {
    //             return estimateInfo;
    //         }
    //         return row;
    //     }));
    //     setOpenSettings(false);
    // }

    return (
        // <div tabIndex="-1" onBlur={(e) => handleBlur(e)}>
        <>
            <TableContainer sx={{paddingBottom: "20px"}}>
                <Table {...{sx: { width: table.getTotalSize()},}}>
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
                                {!estimateData['approvalDate'] && 
                                    <IconButton onClick={handleNewHeader}>
                                        <AddIcon />
                                    </IconButton>
                                }
                            </TableCell>
                            <TableCell sx={{ padding: '2px'}} key={"footer_1"} colSpan={4} >Items {totalItems}</TableCell>
                            <TableCell sx={{ padding: '2px', paddingLeft: '5px' }} key={"footer_2"} colSpan={1} >{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(totalExtension)}</TableCell>
                            <TableCell sx={{ padding: '2px', paddingLeft: '5px' }} key={"footer_3"} colSpan={1} >{totalAvgMarkup.toFixed(2)}%</TableCell>
                            <TableCell sx={{ padding: '2px', paddingLeft: '5px' }} key={"footer_4"} colSpan={1} >{new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD' }).format(totalGross)}</TableCell>
                            <TableCell sx={{ padding: '2px'}} key={"footer_5"} colSpan={1}>ID: {estimateData.id}</TableCell>
                        </TableRow>
                    </TableFooter>
                </Table>
            </TableContainer>
            
            {/* Alert Dialog */}
            <Dialog open={openAlert} onClose={() => setOpenAlert(false)}>
                <DialogTitle>{dialogTitle}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{dialogMessage}</DialogContentText>
                    <DialogActions 
                    >
                        {dialogOkay ? 
                            <Button onClick={(e) => {setOpenAlert(false); setDialogOkay(false);}}>Okay</Button>
                            :
                            <>
                                <Button onClick={(e) => {dialogAction(dialogYesAction)}}>Yes</Button>
                                <Button onClick={(e) => {setOpenAlert(false)}}>No</Button>
                            </>
                        }
                    </DialogActions>
                </DialogContent>
            </Dialog>
        </>
        // </div>
    );
}

export default EstimateTable;