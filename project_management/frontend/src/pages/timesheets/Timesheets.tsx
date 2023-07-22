import React, { useState, useEffect, useMemo } from 'react'
import useAxiosPrivate from '../../hooks/useAxiosPrivate'
import { useParams } from 'react-router-dom'
import { CircularProgress, Grid, Portal } from '@mui/material'
import { SnackBar, Table, Tooltip } from '../../components/Components'
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
                                job
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

                setEmployees(res.employees);
                
                console.log(res.timesheets)

                if(endDate){
                    let startDate = new Date(endDate)
                    startDate.setDate(startDate.getDate() - 13);
                    setDateFilter([startDate, new Date(endDate)]);

                    // Ensure all timesheet workdays are sorted by date for the columns
                    for(let i = 0; i < res.timesheets.length; i ++) {
                        res.timesheets[i].workdaySet.sort((a: WorkdayType, b: WorkdayType) => {
                            return a.date > b.date ? 1 : -1;
                        })
                    }
                }
                else {
                    // Reduce timesheets down to group by startDate
                    res.timesheets = res.timesheets.reduce((items: any[], item: any) => {
                        console.log(items, item)
                        const {id, startDate, endDate, employee, workdaySet, sentToMyob} = item
                        const itemIndex = items.findIndex((it: any) => it.startDate === item.startDate)

                        console.log(itemIndex)
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
                console.log(res.timesheets)
            });
        }

        fetchData();

        const getPayrollDetails = async () => {
            await axiosPrivate({
                method: 'post',
                signal: controller.signal,
                data: JSON.stringify({
                    query: ` mutation getPayrollDetails ($uid: String!) {
                        details: getPayrollDetails(uid:$uid) {
                            success
                            message
                            details
                        }
                    }`,
                    variables: {
                        uid: auth?.myob.id
                    }
                }),
            }).then((response) => {
                const res = response?.data?.data.details;

                if(res?.success) {
                    const details = JSON.parse(res.details);
                    setPayrollDetails(details);
                    setFilterPayrollEmployees(true);
                }
                else {
                    setSnack({variant: "error", message: res.message + " - Error getting Payroll Details. Please contact Developer", active: true});
                    console.log(response)
                }
            })

        }
        getPayrollDetails();

        return () => {
            controller.abort();
        }

    }, [])

    useEffect(() => {
        if(payrollDetails.length > 0 && employees.length > 0) {
            setPayrollDetails(payrollDetails.filter((item: any) => {
                return employees.some((e) => {
                    return e.myobUid === item['Employee']['UID'];
                })
            }))
            
            setLoading(false);
            setFilterPayrollEmployees(false);
        }   
    }, [filterPayrollEmployees])

    return ( <> 
        { 
            !loading ?
            endDate ? <>
                    <TimesheetView 
                        timesheets={timesheets} setTimesheets={setTimesheets} 
                        payrollDetails={payrollDetails} employees={employees} 
                        auth={auth} dateFilter={dateFilter} setSnack={setSnack}/> 
                </>
                :  
                <>              
                    <p>Timesheets</p>
                    <TimesheetTable timesheets={timesheets} />
                </>
            :
            <Grid container direction={'column'} spacing={2} alignContent={'center'}>
                <Grid item xs={12}>
                    <CircularProgress />
                </Grid>
            </Grid>
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

const TimesheetTable = ({timesheets}: {
    timesheets: TimesheetType[]
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
        columnHelper.display({
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
                            <Tooltip title="Not Processed">
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

    return (
        <Table data={timesheets} columns={columns} pagination={true} />
    )
}


export default Timesheets;