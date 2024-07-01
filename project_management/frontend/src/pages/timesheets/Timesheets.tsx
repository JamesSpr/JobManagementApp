import React, { useState, useEffect, useMemo } from 'react'
import useAxiosPrivate from '../../hooks/useAxiosPrivate'
import { NavigateFunction, useNavigate, useParams } from 'react-router-dom'
import { CircularProgress, Grid, Portal, Typography } from '@mui/material'
import { LoadingProgress, SnackBar, Table, Tooltip } from '../../components/Components'
import useAuth from '../auth/useAuth'

import { SnackType } from '../../types/types'
import TimesheetView from './TimesheetView'
import { createColumnHelper } from '@tanstack/react-table'

export interface EmployeeType {
    id: string
    name: string
    myobUid: string
    payBasis: string
}

export interface WorkdayType {
    date: Date
    hours: string
    workType: string
    job: string
    notes: string
    allowOvertime: boolean
}

export interface TimesheetType {
    id: string
    startDate: Date
    endDate: Date
    employee: EmployeeType
    workdaySet: WorkdayType[]
    sentToMyob: boolean
}

export const workDayOptions = {
    "Normal": {
        name: "Normal Hours",
        colour: 'None'
    },
    "AL": {
        name: "Annual Leave",
        colour: '#caa5d4'
    },
    "SICK": {
        name: "Sick Leave",
        colour: '#44d62c'
    },
    "PH": {
        name: "Public Holiday",
        colour: '#8484d7'
    },
    "LWP": {
        name: "Leave Without Pay",
        colour: '#767875'
    },
    "": {
        name: "No Hours",
        colour: '#b1b3b1'
    },
}

const Timesheets = () => {
    const axiosPrivate = useAxiosPrivate()
    const { auth } = useAuth();

    const [loading, setLoading] = useState(true);
    const [employees, setEmployees] = useState<EmployeeType[]>([]);
    const [timesheets, setTimesheets] = useState<TimesheetType[]>([]);
    const [payrollDetails, setPayrollDetails] = useState<any[]>([])
    const [dateFilter, setDateFilter] = useState<Date[]>([]);
    const [filterPayrollEmployees, setFilterPayrollEmployees] = useState(false);
    
    const [snack, setSnack] = useState<SnackType>({active: false, message: '', variant: 'info'});
    
    const { endDate } = useParams();

    useEffect(() => {
        const controller = new AbortController();
        setLoading(true);
        setTimesheets([]);

        const fetchData = async () => {
            await axiosPrivate({
                method: 'post',
                signal: controller.signal,
                data: JSON.stringify({
                    query: `query TimesheetDetails($endDate: String) {
                        employees {
                            myobUid
                            id
                            name
                            payBasis
                        }
                        timesheets (endDate: $endDate){
                            id
                            startDate
                            endDate
                            employee {
                                name
                                payBasis
                            }
                            workdaySet {
                                id
                                date
                                hours
                                workType
                                job {
                                    id
                                    myobUid
                                    name
                                    number
                                }
                                notes
                                allowOvertime
                            }
                            sentToMyob
                        }
                    }`,
                    variables: {
                        endDate: endDate
                    }
                }),
            }).then((response) => {
                const res = response?.data?.data;
                setEmployees(res?.employees);
                
                if(endDate){
                    let startDate = new Date(endDate)
                    startDate.setDate(startDate.getDate() - 13);
                    setDateFilter([startDate, new Date(endDate)]);
                }
                else {
                    // Reduce timesheets down to group by startDate
                    res.timesheets = res?.timesheets.reduce((items: any[], item: any) => {
                        const {id, startDate, endDate, employee, workdaySet, sentToMyob} = item
                        const itemIndex = items.findIndex((it: any) => it.startDate === item.startDate)

                        if(itemIndex === -1) {
                            items.push({id, startDate, endDate, count: 1, sentToMyob})
                        } else {
                            items[itemIndex].count += 1
                            if(items[itemIndex].sentToMyob !== sentToMyob) {items[itemIndex].sentToMyob = "Partial"}
                        }

                        return items;
                    }, [])
                }
                
                setTimesheets(res.timesheets);
            })
        }

        fetchData();

        const getPayrollDetails = async () => {
            await axiosPrivate({
                method: 'post',
                signal: controller.signal,
                data: JSON.stringify({
                    query: `mutation 
                    getMyobPayrollDetails {
                        details: getMyobPayrollDetails {
                            success
                            message
                            details
                        }
                    }`,
                    variables: {}
                }),
            }).then((response) => {
                const res = response?.data?.data.details;

                if(res?.success) {
                    setPayrollDetails(JSON.parse(res.details));
                }
                else {
                    console.log(response)
                    setSnack({variant: "error", message: res?.message + " - Error getting Payroll Details. Please contact Developer", active: true});
                }

            })
        }

        getPayrollDetails();
        

        return () => {
            controller.abort();
        }

    }, [, endDate])

    useEffect(() => {
        if(loading && payrollDetails.length > 0 && employees.length > 0) {
            setPayrollDetails(payrollDetails.filter((item: any) => {
                return employees.some((e) => {
                    return e.myobUid === item['Employee']['UID'];
                })
            }))
            
            setLoading(false);
        }   

    }, [payrollDetails, employees])

    return ( <> 
        { 
            timesheets.length > 0 && !loading ?
            endDate ? <>
                    <TimesheetView 
                        timesheets={timesheets} setTimesheets={setTimesheets} 
                        payrollDetails={payrollDetails} employees={employees} 
                        auth={auth} dateFilter={dateFilter} setSnack={setSnack}/> 
                </>
                :  
                <>              
                    <Typography variant="h5" style={{textAlign: 'center', padding: '15px'}}>Timesheets</Typography>               
                    <TimesheetTable timesheets={timesheets} setTimesheets={setTimesheets} />
                </>
            :
            <LoadingProgress />
        }

        <Portal>
            <SnackBar snack={snack} setSnack={setSnack} />
        </Portal>

    </>
    )
}
import HighlightOffIcon from '@mui/icons-material/HighlightOff';
import RemoveCircleOutlineIcon from '@mui/icons-material/RemoveCircleOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { ConstructionOutlined } from '@mui/icons-material'

const TimesheetTable = ({timesheets, setTimesheets}: {
    timesheets: TimesheetType[]
    setTimesheets: React.Dispatch<React.SetStateAction<TimesheetType[]>>
}) => {

    const columnHelper = createColumnHelper<any>()
    const columns = [
        columnHelper.accessor('startDate', {
            header: () => <p style={{margin: '0', textAlign: 'center'}}>Start Date</p>,
            cell: (info: any) => <p style={{margin: '0', textAlign: 'center'}}>{new Date(info.getValue()).toLocaleDateString('en-AU', {day: 'numeric', month: 'short', year:'numeric'})}</p>,
            size: 120
        }),
        columnHelper.accessor('endDate', {
            header: () => <p style={{margin: '0', textAlign: 'center'}}>Start Date</p>,
            cell: (info: any) => <p style={{margin: '0', textAlign: 'center'}}>{new Date(info.getValue()).toLocaleDateString('en-AU', {day: 'numeric', month: 'short', year:'numeric'})}</p>,
            size: 120
        }),
        columnHelper.accessor('count', {
            header: () => <p style={{margin: '0', textAlign: 'center'}}>Number of Timesheets</p>,
            cell: (info: any) => <p style={{margin: '0', textAlign: 'center'}}>{info.getValue()}</p>,
            size: 100
        }), 
        columnHelper.accessor((row: any) => row?.sentToMyob, {
            id: 'processed',
            header: () => <p style={{margin: '0', textAlign: 'center'}}>Processed</p>,
            size: 100,
            cell: ({getValue}) => {
                if(getValue() == "Partial") {
                    return (
                        <div style={{textAlign: 'center'}}>
                            <Tooltip title="Half Processed">
                                <HighlightOffIcon />
                            </Tooltip>
                        </div>
                    )
                }
                if(getValue() == true) {
                    return (
                        <div style={{textAlign: 'center'}}>
                            <Tooltip title="Processed">
                                <CheckCircleOutlineIcon />
                            </Tooltip>
                        </div>
                    )
                }

                return (
                    <div style={{textAlign: 'center'}}>
                        <Tooltip title="Not Processed">
                            <RemoveCircleOutlineIcon />
                        </Tooltip>
                    </div>
                )
                
            },    
        }),
    ]

    const navigate = useNavigate();

    const handleRowClick = (row: any) => {
        setTimesheets([]);
        navigate(`${row.original.endDate}`)
    }

    return (
        <>
            <div className='grid-container'>
                <button className='button'>Sync Timesheets</button>
            </div>
            <Table data={timesheets} columns={columns} pagination={true} rowOnDoubleClick={handleRowClick}/>
        </>

    )
}


export default Timesheets;