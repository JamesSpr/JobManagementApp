import { useState } from "react";
import { Button, Checkbox, Dialog, DialogContent, FormControlLabel, FormGroup, Grid, IconButton } from "@mui/material"
import { EmployeeType, SnackType, User } from "../../types/types";
import { RowModel, Table } from "@tanstack/react-table";
import CloseIcon from '@mui/icons-material/Close';
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { BasicDialog, FileUploadSection, ProgressButton } from "../../components/Components";

import ArticleIcon from '@mui/icons-material/Article';
import PhotoIcon from '@mui/icons-material/Photo';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

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
    
    const [uploadedFiles, setUploadedFiles] = useState<Blob[]>([]);
    const [fileLimit, setFileLimit] = useState(false);

    const handleJobAllocation = async () => {
        setWaiting(true);

        // Gather all the selected rows
        const selectedRows: string[] = []
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

        const recipients: string[] = []
        Object.entries(emailRecipients as emailRecipientType).map(([key, value]) => {
            if(value){
                recipients.push(key);
            }
        })


        const attachmentPromises: Promise<string>[] = uploadedFiles.map((file) => {
            return new Promise((resolve, reject) => {
                let fileReader = new FileReader();
                fileReader.readAsDataURL(file)
                fileReader.onload = async () => {
                    try{
                        resolve(fileReader.result as string);
                    } catch (err) {
                        reject(err);
                        
                        setWaiting(false);
                        setSnack({active: true, variant:'error', message:"Attachment Error. Please Try Again"})
                        return
                    }
                }
                
                fileReader.onerror = (error) => {
                    reject(error);
                    setWaiting(false);
                    setSnack({active: true, variant:'error', message:"Attachment Error. Please Try Again"})
                    return  
                };
            })
        })

        const attachments: string[] = await Promise.all(attachmentPromises);
        let attachmentNames: string[] = []
        for(var attachment of uploadedFiles) {
            attachmentNames.push(attachment.name);
        }

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation allocateJobEmail ( 
                    $jobs: [String]!, $recipient: [String]!,
                    $attachments: [String]!,$attachmentNames: [String]!,
                ) { email: allocateJobEmail(jobs: $jobs, recipient: $recipient, attachments: $attachments, attachmentNames: $attachmentNames ) {
                    success
                    message
                }
            }`,
            variables: {
                jobs: selectedRows,
                recipient: recipients,
                attachments: attachments,
                attachmentNames: attachmentNames,
            },
        }),
        }).then((response) => {
            const res = response?.data?.data?.email;
            setWaiting(false);

            if(res.success) {
                setSnack({active: true, variant:'success', message:res.message})
                setUploadedFiles([]);
                onClose();
            }
            else {
                setSnack({active: true, variant:'error', message:"Email Error: " + response.data.errors[0].message})
            }

        });
        // }
    }

    const handleClose = (event?: React.MouseEvent<HTMLButtonElement, MouseEvent>, reason?: string) => {
        if (reason !== 'backdropClick') {
            setUploadedFiles([]);
            onClose();
        }
    }

    const handleUploadFiles = (files: any) => {
        const MAX_FILE_COUNT = 30
        const MAX_FILE_SIZE = 20971520 // 20 MB

        const uploaded:any[] = [...uploadedFiles]
        let limitExceeded = false

        const acceptedTypes = ["image/jpeg", "image/png", "image/ico", 
        "application/pdf", 
        "application/csv",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]

        files.some(((file: any) => {
            if(uploaded.findIndex((f: any) => f.name === file.name) === -1) {
                if(uploaded.length === MAX_FILE_COUNT) {
                    setFileLimit(true)
                }

                if(uploaded.length > MAX_FILE_COUNT) {
                    setSnack({active: true, variant: 'error', message:"File Upload Limit Exceeded"})
                    setFileLimit(false);
                    return true
                }
                const fileSizeSum = uploaded.reduce((f, size) => f.size + size, 0)
                if(fileSizeSum + file.size >= MAX_FILE_SIZE) {
                    setSnack({active: true, variant: 'error', message:"Max File Upload Size Exceeded"})
                    setFileLimit(false);
                    return true
                }

                if(acceptedTypes.includes(file.type)) {
                    uploaded.push(file);
                }
                else {
                    setSnack({active: true, variant: 'error', message:"Some files not uploaded due to file type. Contact Developer."})
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

    const removeAttachment = (idx: number) => {
        setUploadedFiles(prev => ([...prev.filter((_, i) => i !== idx)]))
    }
    
    return (
        <>
        <BasicDialog open={open} close={handleClose} maxWidth="sm" title="Email Job Details" center action={handleJobAllocation} waiting={waiting} >
            <FormGroup sx={{marginTop: '5px'}}>
                <Grid container spacing={1}>
                    {
                        users?.map((user: EmployeeType) => {
                            if(user.firstName) {
                                return (
                                    <Grid item xs={12} md={4}>
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
                    {uploadedFiles.map((file: any, idx) => {
                        var fileIcon;
                        switch(file.type){
                            case "application/pdf":
                                fileIcon = <PictureAsPdfIcon className="FileIcon"/>
                                break
                            case "image/jpeg":
                            case "image/png":
                                fileIcon = <PhotoIcon className="FileIcon"/>
                                break
                            default:
                                fileIcon = <ArticleIcon className="FileIcon"/>
                                break
                        }

                        return(
                            <Grid item xs={12} sm={6} md={12/5}>
                                <a className="FileIconLink" onClick={() => removeAttachment(idx)}>
                                    <div className="FileIconDiv">
                                        {fileIcon}<p className="FileIconText">{file.name}</p>
                                    </div>
                                </a>
                            </Grid>
                        )
                    })}
                    {uploadedFiles.length > 0 &&
                        <Grid item xs={12}>
                            <p>Click to remove attachments</p>
                        </Grid>
                    }   
                </Grid>
            </FormGroup>
            {/* <Grid container spacing={1} direction="column" alignContent="center">
                <Grid item xs={12}>
                    <ProgressButton 
                        disabled={Object.values(emailRecipients).every(value => value === false) || waiting} 
                        onClick={handleJobAllocation}
                        name="Send Email"
                        waiting={waiting}
                    />
                </Grid>
            </Grid> */}
        </BasicDialog>
            {/* Email Options
            <Dialog open={open} onClose={handleClose} maxWidth='sm'>
                <DialogContent>
                    <span className="dialogTitle">
                        <h1
                            style={{display: 'inline-block', position: 'relative', left: '24px', width: 'calc(100% - 48px)', textAlign: 'center', fontWeight: 'bold'}}>
                            Email Job Details
                        </h1>
                        <IconButton onClick={e => {handleClose(e, 'close')}} style={{float: 'right', right: '10px', padding: '0px 0px 4px 0px'}} >
                            <CloseIcon />
                        </IconButton>
                    </span>
                    
                </DialogContent>
            </Dialog> */}
        </>
    )
}

export default JobAllocator;