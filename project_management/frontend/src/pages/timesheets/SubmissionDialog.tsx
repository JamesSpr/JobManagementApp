import { useEffect, useState } from 'react'
import { BasicDialog } from "../../components/Components";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { IAuth, SnackType } from "../../types/types";
import { TimesheetType, WorkdayType } from "./Timesheets";

import { Box, Grid, LinearProgress } from '@mui/material'

const TimesheetSubmission = ({open, setOpen, timesheets, setTimesheets, setSnack, payrollDetails, dateFilter, auth}: {
    open: boolean
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
    timesheets: TimesheetType[]
    setTimesheets: React.Dispatch<React.SetStateAction<TimesheetType[]>>
    setSnack: React.Dispatch<React.SetStateAction<SnackType>>
    payrollDetails: any
    dateFilter: Date[]
    auth: IAuth | undefined
}) => {

    const axiosPrivate = useAxiosPrivate();
    const [timesheetSummary, setTimesheetSummary] = useState<any>({})
    const [waiting, setWaiting] = useState(false);

    useEffect(() => {
        // Calculate the total cost of timesheet
        let timesheetPay:number = 0
        let paidHours:number = 0
        let normalHours:number = 0
        let timehalfHours:number = 0
        let doubleHours:number = 0
        
        timesheets.map(timesheet => {
            const payroll = payrollDetails.filter((pr: any) => pr['Employee']['Name'] === timesheet.employee?.name)[0]
            paidHours = 0
            // Calculate the total number of paid hours
            timesheet.workdaySet.map(workday => {
                let numHours = parseFloat(workday.hours)
                if (workday.allowOvertime) {
                    // Public Holiday & Sunday Work: 2x
                    if(workday.workType === "PH" || new Date(workday.date).getDay() == 0) {
                        paidHours += numHours * 2
                        doubleHours += numHours
                        numHours = 0
                    }
                    // Saturday: first 2hrs - 1.5x, remaining 2x
                    else if(new Date(workday.date).getDay() == 6) {
                        if(numHours > 2) {
                            paidHours += 3 + ((numHours - 2) * 2)
                            timehalfHours += 2
                            doubleHours += numHours - 2
                            numHours = 0
                        }
                        else {
                            paidHours += numHours * 1.5
                            timehalfHours += numHours
                            numHours = 0
                        }
                    }
                    
                    // Overtime: 8hrs normal, 2hrs 1.5, remaining 2x
                    else if(numHours > 0) {
                        if(numHours > 8) {
                            numHours -= 8 // Remove normal hours

                            if(numHours > 2) {
                                paidHours += 3 + ((numHours - 2) * 2)
                                timehalfHours += 2
                                doubleHours += numHours - 2
                                numHours = 0
                            }
                            else {
                                paidHours += numHours * 1.5
                                timehalfHours += numHours
                                numHours = 0
                            }

                            numHours = 8; // Replace normal hours
                        }
                    }

                }
                paidHours += numHours;
                normalHours += numHours;
            })

            const pay = payroll['Wage']['HourlyRate']
            timesheetPay += paidHours * pay
            console.log(timesheet.employee.name, ":", paidHours, '*' , pay, '=', paidHours*pay)
        })

        setTimesheetSummary((prev: any) => (
            {...prev, 
            'hours' : {'normal': normalHours, 'timehalf': timehalfHours, 'double': doubleHours, 'total': paidHours},
            'cost': timesheetPay
            }
        ));

    }, [open])

    const handleSubmitTimesheets = async () => {
        setWaiting(true);
        // console.log(timesheets)
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation submitTimesheets($uid:String!, $timesheets: [TimesheetInputType]!, $startDate: String!, $endDate: String!) {
                    submit: submitTimesheets(uid:$uid, timesheets:$timesheets, startDate: $startDate, endDate: $endDate) {
                        success
                        message
                        submissionError
                        timesheets {
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
                    }
                }`,
                variables: {
                    uid: auth?.myob?.id,
                    timesheets: timesheets,
                    startDate: dateFilter[0],
                    endDate: dateFilter[1],
                }
            }),
        }).then((response) => {
            const res = response?.data?.data?.submit;

            if(res.success) {
                setTimesheets(res.timesheets)
                // if(res.debug) {console.log(JSON.parse(res.debug))}
                if(res.submissionError) {
                    setSnack({active: true, message:res.message, variant:'warning'})
                }
                else {
                    setSnack({active: true, message:res.message, variant:'success'})
                }
                handleClose()
            }
            else {
                // Update if partial submission
                if(res.timesheets) {
                    // Ensure all timesheet workdays are sorted by date for the columns
                    for(let i = 0; i < res.timesheets.length; i ++) {
                        res.timesheets[i].workdaySet.sort((a: WorkdayType, b: WorkdayType) => {
                            return a.date > b.date ? 1 : -1;
                        })
                    }
                    setTimesheets(res.timesheets)
                }

                setSnack({active: true, message:"Error Updating Timesheet. Contact Developer." + res.message, variant:'error'})
                console.log(res)
            }
        }).finally(() => {
            setWaiting(false);
        });
    }

    const handleClose = () => {
        setOpen(false);
    }

    return (
        <BasicDialog fullWidth maxWidth={'xl'} open={open} close={handleClose} center={true} 
        title={"Submit Timesheets"} 
        action={handleSubmitTimesheets}
        >
        {open &&
            <Grid container spacing={1} textAlign={'center'} justifyContent={'center'}>
                <Grid item xs={12}>
                    <p><b>Normal Hours:</b> {timesheetSummary?.hours?.normal}</p>
                    <p><b>Overtime (1.5x):</b> {timesheetSummary?.hours?.timehalf}</p>
                    <p><b>Overtime (2x):</b> {timesheetSummary?.hours?.double}</p>
                    <p></p>
                    <p><b>Expected Cost:</b> {new Intl.NumberFormat('en-AU', { style:'currency', currency: 'AUD' }).format(timesheetSummary?.cost)}</p>
                </Grid>
                {waiting ?
                <Box style={{width:'100%', position: 'relative', top:'16px'}}>
                    <LinearProgress />
                </Box>
                : <></>
                }
            </Grid>
        }
        </BasicDialog>
    )

}

export default TimesheetSubmission;