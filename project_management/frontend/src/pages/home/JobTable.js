import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useReactTable, getCoreRowModel, getPaginationRowModel, getFilteredRowModel, 
    getFacetedRowModel, getFacetedUniqueValues, getFacetedMinMaxValues, getSortedRowModel, flexRender } from '@tanstack/react-table'

import DebouncedInput from "../../components/DebouncedInput";

import { Button, CircularProgress, Box, Portal, Snackbar, Alert, Grid, IconButton, FormGroup, FormControlLabel, Checkbox, 
    Dialog, DialogTitle, DialogContent, Typography } from '@mui/material';
import useAuth from '../auth/useAuth';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';

import FilterAltIcon from '@mui/icons-material/FilterAlt';
import CloseIcon from '@mui/icons-material/Close';
import fuzzyFilter from '../../components/FuzzyFilter';
import { InputField, PaginationControls, Tooltip } from '../../components/Components';
import { fetchArchivedData } from './QueryData';
import JobAllocator from './JobAllocator';

const openInNewTab = (url) => {
    const newWindow = window.open(url, '_blank', 'noopener, noreferrer')
    if(newWindow) newWindow.opener = null
}

const JobTable = ({tableData, users, jobStages}) => {

    const { auth } = useAuth();
    const axiosPrivate = useAxiosPrivate();
    const navigate = useNavigate();
    
    const [data, setData] = useState([]);
    const [rowSelection, setRowSelection] = useState({});
    const [columnFilters, setColumnFilters] = useState([]);
    const [globalFilter, setGlobalFilter] = useState('');
    const [sorting, setSorting] = useState([{"id": "id", "desc": true}]);
    const [columnVisibility, setColumnVisibility] = useState({
        'id': false, 'client': true, 'jobNumber':true, 
        'po': false, 'sr': false, 'otherId': false, 
        'location': true, 'building': true, 'title': true, 
        'dateIssued': true, 'priority': true, 'overdueDate': true,
        'stage': true, 'approvedPrice': false, 'invoice': false, 'invoiceDate': false, 
        'invoiceCreatedDate': false, 'region': false, 'detailedLocation': false, 'description': false
    });
    const [allData, setAllData] = useState(false);

    const [waiting, setWaiting] = useState(false);
    const [snack, setSnack] = useState(false);
    const [snackMessage, setSnackMessage] = useState('');
    const [snackVariant, setSnackVariant] = useState('info');

    useEffect(() => {
        setData(tableData);
    }, [tableData])

    useEffect(() => {
        // Set Default Page Size
        table.getState().pagination.pageSize = 30;
    }, [])

    function defineJobIdentifier(row) {
    
        let identifier = "PO" + row.po; // Default Value is PO
        
        if (row.po == '') {
            if(row.sr != '') {
                identifier = "SR" + row.sr;
            }
            else if (row.otherId != ''){
                identifier = row.otherId;
            }
        }
    
        return identifier;
    };

    const getAllData = async () => {
        if(allData === false) {
            setWaiting(true);
            await axiosPrivate({
                method: 'post',
                data: fetchArchivedData(),
            }).then((response) => {
                const res = response?.data?.data?.archivedJobs;
                // console.log(res);
                setWaiting(false);
                // TODO: Add Snackbar
                if(res.edges.length > 0) {

                    for(let i = 0; i < res.edges.length; i++) {
                        res.edges[i].node['dateIssued'] = res.edges[i].node['dateIssued'] ? new Date(res.edges[i].node['dateIssued']).toLocaleDateString('en-AU') : ""
                        res.edges[i].node['overdueDate'] = res.edges[i].node['overdueDate'] ? new Date(res.edges[i].node['overdueDate']).toLocaleDateString('en-AU') : ""
                        res.edges[i].node['invoiceDate'] = res.edges[i].node['invoiceDate'] ? new Date(res.edges[i].node['invoiceDate']).toLocaleDateString('en-AU') : ""
                        res.edges[i].node['invoiceCreatedDate'] = res.edges[i].node['invoiceCreatedDate'] ? new Date(res.edges[i].node['invoiceCreatedDate']).toLocaleDateString('en-AU') : ""
                    }

                    setAllData(true);
                    setData(prev => ([...prev, ...res?.edges?.map(job => job.node)]));
                }
            }).catch((err) => {
                // todo: handle error
                console.log("Error:", err);
            });
        }
    }

    const inDateRange = (row, columnId, filterValue) => {
        let [min, max] = filterValue
        min = isNaN(Date.parse(min)) ? 0 : Date.parse(min)
        max = isNaN(Date.parse(max)) ? 9007199254740992 : Date.parse(max)
        
        const rowValue = row.getValue(columnId) ? Date.parse(row.getValue(columnId).split('/').reverse().join('-')) : 0
        return rowValue >= min && rowValue <= max
    }

    // Table Columns
    const columns = useMemo(() => [
        {
            accessorKey: 'id',
            header: () => 'ID',
            cell: info => info.getValue(),
            size: 50,
        },
        {                
            accessorFn: row => row.client?.name ?? '',
            id: 'client',
            header: () => 'Client',
            cell: info => info.getValue(),
            size: 120,
        },
        {                
            accessorFn: row => defineJobIdentifier(row),
            id: 'jobNumber',
            header: () => 'Job Number',
            cell: info => info.getValue(),
            size: 120,
        },
        {
            accessorFn: row => "PO" + row.po,
            id: 'po',
            header: () => 'PO',
            size: 100,
        },
        {
            accessorFn: row => "SR" + row.sr,
            id: 'sr',
            header: () => 'SR',
            size: 100,
        },
        {
            accessorKey: 'otherId',
            header: () => 'Other',
            size: 100,
        },
        {
            accessorFn: row => row.location?.name ?? '',
            id: 'location',
            header: () => 'Location',
            cell: info => info.getValue(),
            size: 180,
        },
        {
            accessorKey: 'building',
            header: () => 'Building',
            size: 160,
        },
        {
            accessorKey: 'title',
            header: () => 'Title',
            enableSorting: false,
            size: 350,
        },
        {
            accessorKey: 'dateIssued',
            header: () => 'Issue Date',
            filterFn: inDateRange,
            // cell: info => info.getValue() ? new Date(info.getValue()).toLocaleDateString('en-AU') : "na", //{day: '2-digit', month: 'short', year:'numeric'}
            size: 100,
        },
        {
            accessorKey: 'priority',
            header: () => 'Priority',
            size: 70,
        },
        {
            accessorKey: 'overdueDate',
            header: () => 'Overdue Date',
            filterFn: inDateRange,
            // cell: info => info.getValue() ? new Date(info.getValue()).toLocaleDateString('en-AU') : "na",  //{day: '2-digit', month: 'short', year:'numeric'}
            size: 125,
        },
        {
            accessorKey: 'detailedLocation',
            header: () => 'Detailed Location',
            size: 200,
        },
        {
            accessorKey: 'description',
            header: () => 'Description',
            size: 500,
        },
        {
            accessorKey: 'stage',
            header: () => 'Status',
            cell: info => (
               <Tooltip title={(table.options.meta).getStageDescription(info.getValue())}>{info.getValue()}</Tooltip>
            ), 
            size: 80,
        },
        {
            accessorFn: row => row.estimateSet ? row?.estimateSet[row?.estimateSet?.findIndex(element => {
                if(element.approvalDate) {
                    return true;
                }
                return false;
            })]?.price ?? "" : "",
            id: 'approvedPrice',
            header: () => 'Approved Price',
            cell: info => info.getValue() ? "$" + info.getValue() : info.getValue(),
            size: 140,
        },
        {
            accessorFn: row => row?.jobinvoiceSet?.[0]?.invoice?.number ?? "",
            id: 'invoice',
            header: () => 'Invoice #',
            cell: info => info.getValue(),
            size: 90,
        },
        {
            accessorFn: row => row.jobinvoiceSet?.[0]?.invoice?.dateCreated ?? "",
            id: 'invoiceCreatedDate',
            header: () => 'Invoice Created',
            filterFn: inDateRange,
            // cell: info => info.getValue() ? new Date(info.getValue()).toLocaleDateString('en-AU') : "",
            size: 130,
        },
        {
            accessorFn: row => row.jobinvoiceSet?.[0]?.invoice?.dateIssued ?? "",
            id: 'invoiceDate',
            header: () => 'Invoice Sent',
            filterFn: inDateRange,
            // cell: info => info.getValue() ? new Date(info.getValue()).toLocaleDateString('en-AU') : "",
            size: 115,
        },
        {
            accessorFn: row => row.location?.region?.shortName ?? '',
            id: "region",
            header: () => 'Region',
            cell: info => info.getValue(),
            size: 70,
        },
    ], []);

    const defaultColumn = {
        width: "auto",
    }

    const table = useReactTable({
        data,
        columns,
        state: {
            rowSelection,
            columnFilters,
            globalFilter,
            columnVisibility,
            sorting,
        },
        onRowSelectionChange: setRowSelection,
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
        enableMultiRowSelection: false,  
        enableMultiSort: true,
        meta: {
            getStageDescription: (value) => (
                jobStages.map(stage => (
                    stage['name'] === value ? stage['description'] : ""
                ))
            )
        }
        // debugTable: true,
        // debugHeaders: true,
        // debugColumns: true,
    });

    const handleOpenSelected = () => {
        for(var row in rowSelection) {
            // console.log(table.getRowModel().rowsById[row].original)
            const rowData = table.getRowModel().rowsById[row].original;
            openInNewTab("/job/edit/" + defineJobIdentifier(rowData));
        }
    }

    const handleOpenSelectedBSAFE = () => {
        for(var row in rowSelection) {
            // console.log(table.getRowModel().rowsById[row].original)
            const rowData = table.getRowModel().rowsById[row].original;
            if(rowData.bsafeLink) {
                openInNewTab(rowData.bsafeLink);
                return;
            } 
        }
        setSnack(true);
        setSnackVariant('error');
        setSnackMessage('Job does not have a BSAFE Link')
    }

    const [openSettings, setOpenSettings] = useState(false);
    const [openEmailOptions, setOpenEmailOptions] = useState(false);

    const handleCloseSettings = () => {
        if(!waiting) {
            setOpenSettings(false);
        }
    }

    return (
        <>
            <Grid container spacing={1}>
                <Grid item xs={12}>
                    <span style={{maxWidth: table.getTotalSize()}}>
                        <DebouncedInput 
                            value={globalFilter ?? ''}
                            onChange={value => setGlobalFilter(String(value))}
                            placeholder="Search All Jobs"
                            style={{display:'inline-block', width: '80%', maxWidth: '1200px'}}
                        />

                        <IconButton onClick={() => setOpenSettings(true)}>
                            <FilterAltIcon />
                        </IconButton>
                    </span>
                </Grid>
                {data && data.length > 0 ? 
                    <Grid item xs={12} style={{overflowX: 'auto', overflowY: 'hidden'}}>
                        <table style={{width: table.getTotalSize(0), paddingBottom: '10px'}}>
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
                                                        }[header.column.getIsSorted()] ?? null}
                                                    </div>
                                                    {header.column.getCanFilter() ? (
                                                        <div>
                                                            <Filter column={header.column} table={table} />
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
                                            onDoubleClick = {(e) => {navigate("/job/edit/" + defineJobIdentifier(row.original));}}
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
                    </Grid>
                
                : 
                    <Box sx={{display: 'flex', paddingLeft: 'calc(50% - 20px)', paddingBottom:'10px'}} align="center">
                        <CircularProgress />
                    </Box>
            }

            </Grid>

            <Box>
                <Button
                    variant='outlined'
                    onClick={() => setSorting([{"id": "id", "desc": true}])}
                >
                    Reset Sort
                </Button>

                <Button 
                    variant="outlined"
                    sx={{margin: '0px 5px 0px 5px'}}
                    onClick={() => setOpenEmailOptions(true)}
                >
                    Email Job Details
                </Button>

                <Button 
                    variant="outlined"
                    sx={{margin: '0px 5px 0px 5px'}}
                    onClick={handleOpenSelectedBSAFE}
                >
                    Open BSAFE
                </Button>

                <Button
                    variant='outlined'
                    onClick={handleOpenSelected}
                >
                    Open Selected Jobs
                </Button>
                
                {auth?.user.role === "DEV" ? 
                <Box>
                    <Button
                        variant='outlined'
                        onClick={() => setColumnFilters([{"id": "location", "value": ["RAAF Richmond", "RAAF Glenbrook"]}])}
                    >
                        Filter Test
                    </Button>
                </Box>
                : <></>}
            </Box>

            <Portal>
                {/* Notification Snackbar */}
                <Snackbar
                    anchorOrigin={{vertical: "bottom", horizontal:"center"}}
                    open={snack}
                    autoHideDuration={12000}
                    onClose={(e) => setSnack(false)}
                    >
                    <Alert onClose={(e) => setSnack(false)} severity={snackVariant} sx={{width: '100%'}}>{snackMessage}</Alert>
                </Snackbar>
            </Portal>

            {/* Settings Dialog */}
            <Dialog open={openSettings} onClose={handleCloseSettings} maxWidth='lg'>
                <DialogTitle>
                    <Typography sx={{textAlign: 'center'}}>Table Settings</Typography>
                    <IconButton
                        aria-label="close"
                        onClick={handleCloseSettings}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                            marginTop: '4px',
                            color: (theme) => theme.palette.grey[500],
                        }}
                        >
                        <CloseIcon/>
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <FormGroup sx={{marginTop: '5px', marginBottom: '20px'}}>
                        <Grid container>
                            <Grid item xs={12} >
                                {waiting && (
                                    <CircularProgress size={24} 
                                        sx={{
                                            colour: 'primary',
                                            position: 'relative',
                                            top: '7px',
                                            marginRight: '10px',
                                        }}
                                    />
                                )}
                                <FormControlLabel control={
                                    <Checkbox checked={allData} onChange={getAllData}/>
                                } label="Show Archived Jobs" />
                            </Grid>
                        </Grid>
                    </FormGroup>
                    <Typography variant='p1'>Visible Columns</Typography>
                    <FormGroup sx={{marginTop: '5px'}}>
                        <Grid container>
                            {
                                openSettings ? Object.entries(columnVisibility).map(
                                    ([key, value]) => {
                                        return <Grid item xs={2} ><FormControlLabel control={<Checkbox checked={value} onChange={() => setColumnVisibility(prev => ({...prev, [key]: !value}))}/>} label={key} /></Grid>
                                    }
                                ) : null
                            }
                        </Grid>
                    </FormGroup>
                </DialogContent>
            </Dialog>

            <JobAllocator open={openEmailOptions} onClose={() => setOpenEmailOptions(false)} table={table} rowSelection={rowSelection} users={users} snack={{setSnack, setSnackMessage, setSnackVariant}}/>
        </>
    
    );
}

const Filter = ({column, table, ...props}) => {
    const firstValue = table.getPreFilteredRowModel().flatRows[0]?.getValue(column.id)

    const columnFilterValue = column.getFilterValue()
    
    const dateColumns = ['dateIssued', 'overdueDate', 'invoiceDate', 'invoiceCreatedDate']
    const sortedUniqueValues = useMemo(
      () =>
        typeof firstValue === 'number'
          ? [] 
          : Array.from(column.getFacetedUniqueValues().keys()).sort(),
      [column.getFacetedUniqueValues()]
    )
  
    if(dateColumns.includes(column.id)) {
        return (
            <>
                <DebouncedInput
                    type="date"
                    value={(columnFilterValue)?.[0] ?? ''}
                    onChange={value => {
                        column.setFilterValue((old) => [value, old?.[1]])
                    }}
                />
                <DebouncedInput
                    type="date"
                    value={(columnFilterValue)?.[1] ?? ''}
                    onChange={value => {
                        column.setFilterValue((old) => [old?.[0], value])
                    }}
                />
            </>
          )
    }

    if(typeof firstValue === 'number') {
        return (
            <>
                <DebouncedInput
                    type="number"
                    min={Number(column.getFacetedMinMaxValues()?.[0] ?? '')}
                    max={Number(column.getFacetedMinMaxValues()?.[1] ?? '')}
                    value={(columnFilterValue)?.[0] ?? ''}
                    onChange={value =>
                        column.setFilterValue((old) => [value, old?.[1]])
                    }
                    placeholder={`Min ${
                        column.getFacetedMinMaxValues()?.[0]
                        ? `(${column.getFacetedMinMaxValues()?.[0]})`
                        : ''
                    }`}
                />

                <DebouncedInput
                    type="number"
                    min={Number(column.getFacetedMinMaxValues()?.[0] ?? '')}
                    max={Number(column.getFacetedMinMaxValues()?.[1] ?? '')}
                    value={(columnFilterValue)?.[1] ?? ''}
                    onChange={value =>
                        column.setFilterValue((old) => [old?.[0], value])
                    }
                    placeholder={`Max ${
                        column.getFacetedMinMaxValues()?.[1]
                        ? `(${column.getFacetedMinMaxValues()?.[1]})`
                        : ''
                    }`}
                />
            </>
        )
    }

    return (
      <>
        <datalist id={column.id + 'list'}>
          {sortedUniqueValues.slice(0, 5000).map((value, index) => (
            <option value={value?.name ?? value} key={index + '_' + value} />
          ))}
        </datalist>

        <DebouncedInput
          type="text"
          value={(columnFilterValue ?? '')}
          onChange={value => column.setFilterValue(value)}
          placeholder={`${column.getFacetedUniqueValues().size} Items`}
          list={column?.id?.name ?? column.id + 'list'}
          {...props}
        />
      </>
    )
  }


export default JobTable;