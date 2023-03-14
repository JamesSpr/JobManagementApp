import { useState } from "react";
import { Button, Checkbox, Dialog, DialogContent, FormControlLabel, FormGroup, Grid, IconButton } from "@mui/material"
import { User } from "../../types/types";
import { RowModel, Table } from "@tanstack/react-table";
import CloseIcon from '@mui/icons-material/Close';
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

interface JobAllocatorProps {
    open: boolean,
    onClose: () => void,
    users: [User],
    table?: Table<any>
    rowSelection?: {}
    job?: string
    snack: {
        setSnack: (value: boolean) => void
        setSnackVariant: (variant: string) => void
        setSnackMessage: (message: string) => void
    }
}

const JobAllocator: React.FC<JobAllocatorProps> = ({open, onClose, users, job, table, rowSelection, snack}) => {

    interface emailRecipientType {
        [email: string]: boolean
    }

    const axiosPrivate = useAxiosPrivate();
    const [emailRecipients, setEmailRecipients] = useState<emailRecipientType>({})

    const handleJobAllocation = async () => {
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

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `mutation allocateJobEmail ( 
                    $jobs: [String]!, 
                    $recipient: [String]!
                )
                { allocate_job_email: allocateJobEmail( jobs: $jobs, recipient: $recipient )
                {
                    success
                    message
                }
            }`,
            variables: {
                jobs: selectedRows,
                recipient: recipients
            },
        }),
        }).then((response) => {
            const res = response?.data?.data?.allocate_job_email;
            snack.setSnack(true);

            if(res.success) {
                snack.setSnackVariant('success');
                snack.setSnackMessage(res.message);
                onClose();
            }
            else {
                snack.setSnackVariant('error');
                snack.setSnackMessage("Email Error: " + response.data.errors[0].message);
            }

        });
    }

    const handleClose = (event: React.MouseEvent<HTMLButtonElement, MouseEvent>, reason: string) => {
        if (reason !== 'backdropClick') {
            onClose();
        }
    }
    
    return (
        <>
            {/* Email Options */}
            <Dialog open={open} onClose={handleClose} maxWidth='lg'>
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
                                users?.map((user: User) => {
                                    if(user.node.firstName) {
                                        return (
                                            <Grid item xs={12} >
                                                <FormControlLabel 
                                                    control={<Checkbox checked={emailRecipients[user.node.email]} 
                                                    onChange={() => setEmailRecipients((prev: any) => ({...prev, [user.node.email]: !emailRecipients[user.node.email]}))}/>} 
                                                    label={user.node.firstName + " "  + user.node.lastName}
                                                />
                                            </Grid>
                                        )
                                    }
                                })
                            }
                        </Grid>
                    </FormGroup>
                    <Button disabled={Object.values(emailRecipients).every(value => value === false)} onClick={handleJobAllocation}>Send Email</Button>
                </DialogContent>
                    
            </Dialog>
        </>
    )
}

export default JobAllocator;