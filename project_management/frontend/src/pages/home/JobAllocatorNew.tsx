import { useState } from "react";
import { Button, Checkbox, Dialog, DialogContent, FormControlLabel, FormGroup, Grid, IconButton } from "@mui/material"
import { EmployeeType, SnackType, User } from "../../types/types";
import { RowModel, Table } from "@tanstack/react-table";
import CloseIcon from '@mui/icons-material/Close';
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { FileUploadSection, ProgressButton } from "../../components/Components";

interface JobAllocatorProps {
    open: boolean,
    onClose: () => void,
    users: EmployeeType[],
    table?: Table<any>
    rowSelection?: {}
    job?: string
    setSnack: React.Dispatch<React.SetStateAction<SnackType>>
}

const JobAllocator: React.FC<JobAllocatorProps> = ({open, onClose, users, job, table, rowSelection, setSnack}) => {

    interface emailRecipientType {
        [email: string]: boolean
    }

    const axiosPrivate = useAxiosPrivate();
    const [emailRecipients, setEmailRecipients] = useState<emailRecipientType>({})
    const [waiting, setWaiting] = useState(false);

    const handleJobAllocation = async () => {
        setWaiting(true);
        
        const target = document.getElementById('attachments') as HTMLInputElement;
        const [file] = target?.files as FileList;
        // console.log("File", file)

        // Gather all the selected rows
        const selectedRows: String[] = []
        if(table && rowSelection) {
            table.getCoreRowModel().rows.map(row => {
                if(Object.keys(rowSelection).includes(row.id)){
                    selectedRows.push(row.original.id);
                }
            });
        }
        else if(job) {
            selectedRows.push(job);
        }
        else {
            console.log("Error. No job provided")
        }

        const recipients: String[] = []
        Object.entries(emailRecipients as emailRecipientType).map(([key, value]) => {
            if(value){
                recipients.push(key);
            }
        })

        // for(let file in uploadedFiles) {
        //     let fileReader = new FileReader();
        //     fileReader.readAsDataURL(file)
        //     fileReader.onload = async () => {
        //         let data = fileReader.result;
        //         // console.log(data)
        //         // if(data) {
        //         //     files.push(data);
        //         // }
        //     }
        // }
        // console.log(uploadedFiles)
        
        let fileReader = new FileReader();
        fileReader.readAsDataURL(file)
        fileReader.onload = async () => {
            let data = fileReader.result;
            console.log(data);

            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                    query: `mutation allocateJobEmail ( 
                        $jobs: [String]!, 
                        $recipient: [String]!,
                        $attachments: [String]!,
                    )
                    { allocate_job_email: allocateJobEmail( jobs: $jobs, recipient: $recipient, attachments: $attachments )
                    {
                        success
                        message
                    }
                }`,
                variables: {
                    jobs: selectedRows,
                    recipient: recipients,
                    attachments: data,
                },
            }),
            }).then((response) => {
                const res = response?.data?.data?.allocate_job_email;
                setWaiting(false);

                if(res.success) {
                    setSnack({active: true, variant:'success', message:res.message})
                    onClose();
                }
                else {
                    setSnack({active: true, variant:'error', message:"Email Error: " + response.data.errors[0].message})
                }

            });
        }
    }

    const handleClose = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>, reason: string) => {
        if (reason !== 'backdropClick') {
            onClose();
        }
    }

    const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
    const [fileLimit, setFileLimit] = useState(false);

    const handleUploadFiles = (files: any) => {
        const MAX_FILE_COUNT = 10
        const uploaded:any[] = [...uploadedFiles]
        let limitExceeded = false
        files.some(((file: any) => {
            if(uploaded.findIndex((f: any) => f.name === file.name) === -1) {
                uploaded.push(file);
                if(uploaded.length === MAX_FILE_COUNT) {
                    setFileLimit(true)
                }
                if(uploaded.length > MAX_FILE_COUNT) {
                    setSnack({active: true, variant: 'error', message:"File Upload Limit Exceeded"})
                    setFileLimit(false);
                    return true
                }
            }
        }))
        if(!limitExceeded) {
            setUploadedFiles(uploaded);
        }
    }

    const handleFileEvent = (e: { target: { files: any; }; }) => {
        const chosenFiles = Array.prototype.slice.call(e.target.files)
        handleUploadFiles(chosenFiles);
    }
    
    return (
        <>
            {/* Email Options */}
            <Dialog open={open} onClose={handleClose} maxWidth='sm'>
                <DialogContent>
                    <span className="dialogTitle">
                        <h1
                            style={{display: 'inline-block', position: 'relative', left: '24px', width: 'calc(100% - 48px)', textAlign: 'center', fontWeight: 'bold'}}>
                            Who would you like to send the job details to?
                        </h1>
                        <IconButton onClick={e => {handleClose(e, 'close')}} style={{float: 'right', right: '10px', padding: '0px 0px 4px 0px'}} >
                            <CloseIcon />
                        </IconButton>
                    </span>
                    <FormGroup sx={{marginTop: '5px'}}>
                        <Grid container spacing={1}>
                            {
                                users?.map((user: EmployeeType) => {
                                    if(user.firstName) {
                                        return (
                                            <Grid item xs={12} >
                                                <FormControlLabel 
                                                    control={<Checkbox checked={emailRecipients[user.email]} 
                                                    onChange={() => setEmailRecipients((prev: any) => ({...prev, [user.email]: !emailRecipients[user.email]}))}/>} 
                                                    label={user.firstName + " "  + user.lastName}
                                                />
                                            </Grid>
                                        )
                                    }
                                })
                            }
                            <Grid item xs={12} >
                                {uploadedFiles.map((file: any) => (
                                    <span>{file.name}  </span>
                                ))}
                            </Grid>
                            <Grid item xs={12} >
                                <input type="file" id="attachments" 
                                    // Accept: images, PDFs, word documents
                                    accept="image/*,.pdf, .xlsx, .csv,
                                        .doc,.docx,.xml,application/msword,
                                        application/vnd.openxmlformats-officedocument.wordprocessingml.document" 
                                        onChange={handleFileEvent}
                                        className="fileUpload"
                                    multiple
                                />    
                            </Grid>
                        </Grid>
                    </FormGroup>
                    <ProgressButton 
                        disabled={Object.values(emailRecipients).every(value => value === false) || waiting} 
                        onClick={handleJobAllocation}
                        name="Send Email"
                        waiting={waiting}
                    />
                </DialogContent>
            </Dialog>
        </>
    )
}

export default JobAllocator;