import React, { useEffect, useState } from 'react'
import { BasicDialog, InputField, Tooltip } from "../../components/Components"
import { TimesheetType, workDayOptions } from "./Timesheets"
import { Divider, Grid } from '@mui/material'
import useAxiosPrivate from '../../hooks/useAxiosPrivate'
import { SnackType } from '../../types/types'


const TimesheetEditor = ({open, setOpen, timesheets, setTimesheets, employeeEntitlements, setEmployeeEntitlements, setSnack} : {
    open: boolean
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
    timesheets: TimesheetType[]
    setTimesheets: React.Dispatch<React.SetStateAction<TimesheetType[]>>
    employeeEntitlements: any
    setEmployeeEntitlements: React.Dispatch<React.SetStateAction<any>>
    setSnack: React.Dispatch<React.SetStateAction<SnackType>>
}) => {

    const axiosPrivate = useAxiosPrivate();
    const [dataChanged, setDataChanged] = useState(false);
    const [entitlementLimitExceeded, setEntitlementLimitExeeded] = useState<string[]>([])

    const updateTimesheets = async () => {
        let newTimesheet = timesheets[parseInt(employeeEntitlements.id)]
        setTimesheets(old => old.map((row, index) => {
            if(index === parseInt(employeeEntitlements.id)) {
                newTimesheet = {...old[employeeEntitlements.id], workdaySet: employeeEntitlements.work}
                return newTimesheet
            }
            return row;
        }));
        
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation updateTimesheet($timesheet: TimesheetInputType!) {
                    update: updateTimesheet(timesheet:$timesheet) {
                        success
                    }
                }`,
                variables: {
                    timesheet: newTimesheet
                }
            }),
        }).then((response) => {
            const res = response?.data?.data?.update;

            if(res.success) {
                handleClose();
            }
            else {
                setSnack({active: true, message:"Error Updating Timesheet. Contact Developer.", variant:'error'})
                console.log(res);
            }
        });
    }

    const handleClose = (event?: {}, reason?: string) => {
        if (reason !== 'backdropClick') {
            setEmployeeEntitlements({});
            setOpen(false);
        }
    }

    // Recalculate Balances
    useEffect(() => {
        let newRequested = {'Annual Leave Accrual': 0, 'Personal Leave Accrual': 0};
        employeeEntitlements?.work?.map((day: any) => {
            if(day.workType === "AL") {
                newRequested['Annual Leave Accrual'] += parseFloat(day.hours) ?? 0;
            }
            if(day.workType === "SICK") {
                newRequested['Personal Leave Accrual'] += parseFloat(day.hours) ?? 0;
            }
        })
        setEmployeeEntitlements((prev: any) => ({...prev, requested: newRequested}))
    }, [employeeEntitlements.work])


    // Check if any of the entitlements are being exceeded
    useEffect(() => {
        setEntitlementLimitExeeded([])
        employeeEntitlements?.accrued?.map((ent: any) => {
            const entitlementCalc = parseFloat(ent['Total']) - parseFloat(employeeEntitlements.requested[ent['EntitlementCategory']['Name']])
            if(entitlementCalc < 0) {
                if(ent['EntitlementCategory']['Name'] == "Annual Leave Accrual") {
                    setEntitlementLimitExeeded(prev => [...prev, 'AL'])
                }

                if(ent['EntitlementCategory']['Name'] == "Personal Leave Accrual") {
                    setEntitlementLimitExeeded(prev => [...prev, 'SICK'])
                }
            }
        })
    }, [employeeEntitlements])

    const handleChange = (e: { target: { value: React.SetStateAction<string> } }, i: number) => {
        let newVal = e.target.value
        if (newVal === '') { newVal = '0' }
        setEmployeeEntitlements((prev: any) => ({...prev, work: prev.work.map((row: any, index: number) => {
            if(index == i) {
                return {...row, hours: newVal}
            }
            return row;
        })}))
        setDataChanged(true);

    }

    const handleSelection = (e: { target: { value: React.SetStateAction<string> } }, i: number) => {
        setEmployeeEntitlements((prev: any) => ({...prev, work: prev.work.map((row: any, index: number) => {
            if(index == i) {
                return {...row, workType: e.target.value}
            }
            return row;
        })}))
        setDataChanged(true);
    }
    
    const handleCheck = (e: { target: { value: React.SetStateAction<string> } }, i: number) => {
        setEmployeeEntitlements((prev: any) => ({...prev, work: prev.work.map((row: any, index: number) => {
            if(index == i) {
                return {...row, allowOvertime: !row.allowOvertime}
            }
            return row;
        })}))
        setDataChanged(true);
    }

    return ( <>
        <BasicDialog fullWidth maxWidth={'xl'} open={open} close={handleClose} center={true} 
            title={"Edit Timesheet - " + employeeEntitlements?.employee?.name} 
            action={updateTimesheets} okay={true}
        >
        {open &&
            <Grid container spacing={1} textAlign={'center'} justifyContent={'center'}>
                {employeeEntitlements?.accrued?.map((ent: any) => {
                    const entitlementCalc = parseFloat(ent['Total']) - parseFloat(employeeEntitlements?.requested[ent['EntitlementCategory']['Name']])

                    return(
                        <Grid item xs={6} sm={2.5}>
                            <h2>{ent['EntitlementCategory']['Name']}</h2>
                            <p><b>Remaining:</b> {ent['Total']}</p>
                            <p><b>Requested:</b> {employeeEntitlements?.requested[ent['EntitlementCategory']['Name']]}</p>
                            <p style={{color: entitlementCalc < 0 ? 'red': 'black'}}><b>Balance:</b> {entitlementCalc.toFixed(2)}</p>
                        </Grid>
                    )
                })}
                <Grid item xs={12}>
                    <Divider variant='middle'/>
                </Grid>
                {employeeEntitlements?.work?.map((work: any, i: number) => {
                    return (
                        <Grid item xs={12/2} sm={12/7}>
                            <p><b>{new Date(work.date).toLocaleDateString('en-AU', { weekday: 'long', day: '2-digit', month: '2-digit', year:'numeric' })}</b></p>
                            <InputField type='number' label='Hours' width={150} step={0.01} min={'0'} value={work.hours} onChange={e => handleChange(e, i)} />
                            <Tooltip title="Allow Overtime" arrow="right">
                                <input type="checkbox" checked={work.allowOvertime} onChange={e => handleCheck(e, i)} style={{marginLeft: '10px'}}/>
                            </Tooltip>
                            <InputField type="select" label='Type' width={175} onChange={e => handleSelection(e, i)} value={work.workType}
                                style={{backgroundColor: entitlementLimitExceeded?.includes(work.workType) ? "red" : "white"}}>
                                {Object.keys(workDayOptions)?.map((key, i) => (
                                    <option key={i} value={key} style={{backgroundColor: entitlementLimitExceeded?.includes(key) ? "red" : "white"}}>{(workDayOptions as any)[key].name}</option>
                                ))}
                            </InputField>
                        </Grid>
                    )
                })}
            <Grid item xs={12}/>
            </Grid>
        }
        </BasicDialog>
    </>
    )
}

export default TimesheetEditor;