import { Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import React, { FC } from 'react';


interface DeleteDialogType {
    open: boolean
    close: () => void
    action: () => {}
    title: string
    message: string
    okay?: boolean
}

const DeleteDialog:FC<DeleteDialogType> = ({open, close, title, message, okay, action}) => {

    return (
        <>
            {/* Alert Dialog */}
            <Dialog open={open} onClose={close}>
                <DialogTitle>{title}</DialogTitle>
                <DialogContent>
                    <DialogContentText>{message}</DialogContentText>
                    <DialogActions 
                    >
                        {okay ? 
                            <Button onClick={action}>Okay</Button>
                            :
                            <>
                                <Button onClick={action}>Yes</Button>
                                <Button onClick={close}>No</Button>
                            </>
                        }
                    </DialogActions>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default DeleteDialog;