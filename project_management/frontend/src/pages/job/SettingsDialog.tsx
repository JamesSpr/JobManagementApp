import { BasicDialog, InputField } from "../../components/Components";
import { Button, Grid, Typography, Box, Checkbox, CircularProgress } from '@mui/material';
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import useAuth from "../auth/useAuth";
import { JobType, SnackType } from "../../types/types";

const SettingsDialog = ({open, setOpen, job, setJob, handleInput, waiting, setWaiting, setSnack}:{
    open: boolean
    setOpen: React.Dispatch<React.SetStateAction<boolean>>
    job: JobType
    setJob: React.Dispatch<React.SetStateAction<JobType>>
    handleInput: () => void
    waiting: any
    setWaiting: React.Dispatch<React.SetStateAction<any>>
    setSnack: React.Dispatch<React.SetStateAction<SnackType>>
}) => {

    const axiosPrivate = useAxiosPrivate();
    const { auth } = useAuth();

    const checkFolder = async () => {

        setWaiting((prev: any) => ({...prev, 'checkFolder': true}));

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation checkFolder($jobId:String!) {
                    check_folder: checkFolder(jobId:$jobId) {
                        success
                        message
                    }
                }`,
                variables: {
                    jobId: job.id
                }
            })
        }).then((response) => {
            const res = response.data?.data?.check_folder;

            if(res.success) {
                setSnack({active: true, variant:'success', message: res.message})
            }
            else {
                setSnack({active: true, variant:'error', message: res.message})
                console.log("Error: ", res.message);
            }
        }).finally(() => {
            setWaiting((prev: any) => ({...prev, 'checkFolder': false}));
        })
    }

    const repairMyobSync = async () => {
        setWaiting((prev: any) => ({...prev, 'repairMyobSync': true}));

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation repairSync($uid:String!, $jobId:String!) {
                    repair_sync: repairSync(uid:$uid, jobId:$jobId) {
                        success
                        message
                    }
                }`,
                variables: {
                    uid: auth?.myob.id,
                    jobId: job.id,
                }
            })
        }).then((response) => {
            const res = response.data?.data?.repair_sync;
            
            if(res.success) {
                setSnack({active: true, variant: 'success', message: res.message})
            }
            else {
                setSnack({active: true, variant: 'error', message: res.message})
            }
        }).finally(() => {
            setWaiting((prev: any) => ({...prev, 'repairMyobSync': false}));
        })

    }

    const generateInvoice = async () => {

        setWaiting((prev: any) => ({...prev, 'generateInvoice': true}));

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation generateInvoice($uid:String!, $job:String!) {
                    generate_invoice: generateInvoice(uid:$uid, job:$job) {
                        success
                        message
                    }
                }`,
                variables: {
                    uid: auth?.myob.id,
                    job: job.id,
                }
            })
        }).then((response) => {
            // console.log("success", response);
            const res = response.data?.data?.generate_invoice;
            
            if(res.success) {
                setSnack({active: true, variant:'success', message: res.message});
            }
            else {
                setSnack({active: true, variant:'error', message: "Error: " + res.message});
            }
        }).finally(() => {
            setWaiting((prev: any) => ({...prev, 'generateInvoice': false}));
        })
    }

    const handleClose = (e?: any, reason?: string) => {
        if (reason !== 'backdropClick') {
            setOpen(false);
        }
    }

    return (
        <BasicDialog open={open} close={handleClose} 
            action={handleClose} okay center
            maxWidth="md" title="Job Settings" 
        >
            <Grid container spacing={1} textAlign={'center'} justifyContent={'center'}>
                <Grid item xs={12}> {/* Accounts */}
                    <Typography variant='body1' style={{display:'inline-block', verticalAlign: 'bottom'}}> Cancelled? </Typography>
                    <Checkbox checked={job.cancelled} onChange={(e: { target: { checked: any; }; }) => {setJob((prev: any) => ({...prev, 'cancelled': e.target.checked}))}} style={{paddingBottom: '0px', verticalAlign: 'bottom'}}/>
                    <InputField type="text" name="cancelReason" label="Reason" value={job.cancelReason} onChange={handleInput}/>
                </Grid>
                <Grid item xs={12}> {/* Settings */}
                    <InputField type="select" name="workType" 
                        label="Work Type" width={200}
                        value={job.workType ?? ""} onChange={handleInput}
                    >
                        <option key={0} value={""}>None</option>
                        <option key={1} value={"Commercial"}>Commercial</option>
                        <option key={2} value={"Resedential"}>Resedential</option>
                    </InputField>
                    <InputField type="select" name="opportunityType" 
                        label="Opportunity Type" width={200}
                        value={job.opportunityType ?? ""} onChange={handleInput}
                    >
                        <option key={0} value={""}>None</option>
                        <option key={1} value={"Reactive Maintenance"}>Reactive Maintenance</option>
                        <option key={2} value={"Project"}>Project</option>
                    </InputField>
                </Grid>
                <Grid item xs={12}>
                    <InputField type="text" width={400} name="bsafeLink" label="BSAFE Link" value={job.bsafeLink} onChange={handleInput}/>
                </Grid>
                <Grid item xs={12}>
                    <Box sx={{position: 'relative', display: 'inline-block'}}>                                              
                        <Button onClick={checkFolder}>
                            Create Job Folder
                        </Button>
                        {waiting.checkFolder && (
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
                </Grid>
                { auth?.user.role === "DEV" || auth?.user.role === "PMU" ?
                    <Grid item xs={12}>
                        <Box sx={{position: 'relative', align: "center", display: 'inline-block'}}>                                              
                            <Button onClick={generateInvoice}>
                                Generate Invoice
                            </Button>
                            {waiting.generateInvoice && (
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
                        <Box sx={{position: 'relative', align: "center", display: 'inline-block'}}>                                              
                            <Button onClick={repairMyobSync}>
                                Repair MYOB Sync
                            </Button>
                            {waiting.repairMyobSync && (
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
                        <p>ID: {job.id}</p>
                    </Grid>
                    :   <></>
                }
            </Grid>
        </BasicDialog>
    )
}

export default SettingsDialog;