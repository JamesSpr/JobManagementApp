import React, { useEffect, useState } from 'react'
import { BasicDialog, InputField } from "../../components/Components"
import { TimesheetType, workDayOptions } from "./Timesheet"
import { Divider, Grid } from '@mui/material'


const TimesheetEditor = ({open, setOpen, setTimesheets, employeeEntitlements, setEmployeeEntitlements} : {
    open: boolean
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
    timesheets: TimesheetType[]
    setTimesheets: React.Dispatch<React.SetStateAction<TimesheetType[]>>
    employeeEntitlements: any
    setEmployeeEntitlements: React.Dispatch<React.SetStateAction<any>>
}) => {

    const [dataChanged, setDataChanged] = useState(false);
    const [entitlementLimitExceeded, setEntitlementLimitExeeded] = useState({"AL": false, "SICK":false})

    const updateTimesheets = () => {
        setTimesheets(old => old.map((row, index) => {
            if(index === parseInt(employeeEntitlements.id)) {
                return {...old[employeeEntitlements.id], workdaySet: employeeEntitlements.work}
            }
            return row;
        }));

        handleClose();
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

    return (
        <BasicDialog fullWidth maxWidth={'xl'} open={open} close={handleClose} center={true} 
            title={"Edit Timesheet - " + employeeEntitlements.employee?.name} 
            action={updateTimesheets} okay={true}
        >
        {open &&
            <Grid container spacing={1} textAlign={'center'} justifyContent={'center'}>
                {/* <Grid item xs={3}>
                </Grid> */}
                {employeeEntitlements.accrued.map((ent: any) => {
                    const entitlementCalc = parseFloat(ent['Total']) - parseFloat(employeeEntitlements.requested[ent['EntitlementCategory']['Name']])

                    return(
                        <Grid item xs={2.5} style={{textAlign: 'center'}}>
                            <h2>{ent['EntitlementCategory']['Name']}</h2>
                            <p><b>Remaining:</b> {ent['Total']}</p>
                            <p><b>Requested:</b> {employeeEntitlements.requested[ent['EntitlementCategory']['Name']]}</p>
                            <p style={{color: entitlementCalc < 0 ? 'red': 'black'}}><b>Balance:</b> {entitlementCalc.toFixed(2)}</p>
                        </Grid>
                    )
                })}
                {/* <Grid item xs={3}>
                </Grid> */}
                <Grid item xs={12}>
                    <Divider variant='middle'/>
                </Grid>
                {employeeEntitlements.work.map((work: any, i: number) => {
                    const handleChange = (e: { target: { value: React.SetStateAction<string> } }) => {
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

                    const handleSelection = (e: { target: { value: React.SetStateAction<string> } }) => {
                        let newVal = e.target.value
                        if (newVal === '') { newVal = '0' }
                        setEmployeeEntitlements((prev: any) => ({...prev, work: prev.work.map((row: any, index: number) => {
                            if(index == i) {
                                return {...row, workType: newVal}
                            }
                            return row;
                        })}))
                        setDataChanged(true);
                    }

                    return (
                        <Grid item xs={12/7}>
                            <p><b>{new Date(work.date).toLocaleDateString('en-AU', { weekday: 'long', day: '2-digit', month: '2-digit', year:'numeric' })}</b></p>
                            <InputField type='number' label='Hours' width={175} step={0.01} min={'0'} value={work.hours} onChange={handleChange} />
                            <InputField type="select" label='Type' width={175} onChange={handleSelection} value={work.workType}>
                                {Object.keys(workDayOptions).map((key, i) => (
                                    <option key={i} value={key} style={{backgroundColor: "red"}}>{(workDayOptions as any)[key].name}</option>
                                ))}
                            </InputField>
                        </Grid>
                    )
                })}
            <Grid item xs={12}/>
            </Grid>
        }
        </BasicDialog>
    )
}

export default TimesheetEditor;