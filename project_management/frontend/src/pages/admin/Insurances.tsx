import React, { FC, ReactNode, useState, useEffect, useMemo } from "react";
import { Box, Tab, Tabs, Grid, Dialog, DialogContent, Typography, IconButton } from '@mui/material';
import { ColumnDef } from "@tanstack/table-core";
import { FileUploadSection, InputField, Table, ProgressButton } from "../../components/Components";
import { HTMLElementChange, InsuranceType } from "../../types/types";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import { CheckboxCell, EditableCell, EditableDateCell } from "../../components/TableHelpers";

const Insurances = ({insurances, setInsurances, setUpdateRequired}: {
    insurances: InsuranceType[],
    setInsurances: React.Dispatch<React.SetStateAction<InsuranceType[]>>,
    setUpdateRequired: React.Dispatch<React.SetStateAction<boolean>>,
}) => {
    
    const [newInsurancePaths, setNewInsurancePaths] = useState({thumbnail: '', filename: ''});
    const [waiting, setWaiting] = useState({update: false})
    const axiosPrivate = useAxiosPrivate()
    
    const [newDialog, setNewDialog] = useState(false);

    const previewInsurance = (thumbnail: string) => {
        console.log(thumbnail)
    }


    const columns = useMemo<ColumnDef<InsuranceType>[]>(() => [
        {
            accessorKey: 'description',
            header: () => "Description",
            cell: props => EditableCell({...props, setUpdateRequired}),
            size: 300,
        },
        {
            accessorKey: 'issueDate',
            header: () => "Issue Date",
            cell: props => EditableDateCell({...props, setUpdateRequired}),
            size: 150,
        },
        {
            accessorKey: 'startDate',
            header: () => "Start Date",
            cell: props => EditableDateCell({...props, setUpdateRequired}),
            size: 150,
        },
        {
            accessorKey: 'expiryDate',
            header: () => "Expiry Date",
            cell: props => EditableDateCell({...props, setUpdateRequired}),
            size: 150,
        },
        {
            accessorKey: 'active',
            header: () => "Active",
            cell: props => CheckboxCell({...props, setUpdateRequired}),
            size: 80,
        },
        {
            accessorKey: 'thumbnail',
            header: () => "Preview",
            cell: info => {
                if(info.getValue() == "") return (<></>)
                return(
                    <IconButton onClick={() => previewInsurance(info.getValue() as string)}>
                        <PictureAsPdfIcon />
                    </IconButton> 
                )
            },
            size: 80,
        },
    ], [] )

    const handleNewInsurance = async () => {

        setWaiting(prev => ({...prev, update: true}));
        const target = document.getElementById('upload_insurances') as HTMLInputElement;
        const [file] = target?.files as FileList;

        if (!file) {
            setWaiting(prev => ({...prev, 'create': false}));
            return;
        }

        let fileReader = new FileReader();
        fileReader.readAsDataURL(file)
        fileReader.onload = async () => {
            let data = fileReader.result

            // Post insurance to backend and get path
            await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                    query: `
                    mutation ($file: String!, $filename: String!) {
                        upload: pdfToImage(file: $file, filename: $filename) {
                            success
                            filePath
                            thumbnailPath
                        }
                    }`,
                    variables: {
                        file: data,
                        filename: file.name
                    },
                }),
            }).then((response) => {
                const res = response?.data?.data?.upload; 
                // console.log(res);
                if(res.success) {
                    setNewInsurancePaths({filename: res.filePath, thumbnail: res.thumbnailPath});
                }
                else {
                    // setSnackVariant('error');
                    // setSnackMessage(res.message);
                    console.log("Error Uploading Insurance", res)
                }
            }).catch((err) => {
                console.log("error:", err);
                // setSnackVariant('error');
                // setSnackMessage(res.message);
            }).finally(() => {
                setWaiting(prev => ({...prev, update: false}));
            });
        }

        setNewDialog(true);
    }

    const handleClose = (event: {}, reason: string) => {
        if (reason !== 'backdropClick') {
            setNewDialog(false);
        }
        else {
            setNewInsurancePaths({thumbnail: '', filename: ''})
            setNewDialog(false);
        }
    }

    const [sorting, setSorting] = useState([{"id": "active", "desc": true}]);

    return (
        <>
            <Grid container
                direction={'column'}
                alignItems={'center'}
            >
                <Grid item xs={12}>
                    <p>Insurances Information/Details</p>
                    <Table columns={columns} data={insurances} setData={setInsurances} 
                        pagination={true}
                        sorting={sorting} setSorting={setSorting}
                    />
                    <p>Upload Insurances</p>
                    <FileUploadSection onSubmit={handleNewInsurance} waiting={waiting.update} id="upload_insurances" type=".pdf" button="Upload Insurances"/>
                </Grid>
            </Grid>

            <NewInsurance open={newDialog} onClose={handleClose} newInsurance={newInsurancePaths} setData={setInsurances}/>
        </>
    )
}

const NewInsurance = ({ open, onClose, newInsurance, setData }: {
    open: boolean,
    onClose: (event: {}, reason: string) => void,
    newInsurance: {thumbnail: string, filename: string},
    setData: React.Dispatch<React.SetStateAction<InsuranceType[]>>}
) => {

    const axiosPrivate = useAxiosPrivate()
    const [insurance, setInsurance] = useState<InsuranceType>({description:'', issueDate: '', startDate: '', expiryDate: '', active: true, filename: '', thumbnail: ''});
    const [fieldError, setFieldError] = useState({description: false, issueDate: false, startDate: false, expiryDate: false});
    const [waiting, setWaiting] = useState(false);

    useEffect(() => {
        setInsurance(prev => ({...prev, thumbnail: newInsurance.thumbnail, filename: newInsurance.filename}))
    }, [newInsurance])
    
    const handleSubmit = async () => {
        setWaiting(true);

        await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                    query: `
                    mutation createInsurance($insurance: InsuranceInputType!) {
                        create: createInsurance(insurance: $insurance) {
                            success 
                            data {
                                id
                                description
                                startDate
                                expiryDate
                                active
                                thumbnail
                            }
                        }
                    }`,
                    variables: {
                        insurance: insurance,
                    },
                }),
            }).then((response) => {
                const res = response?.data?.data?.create;
                // console.log(res);
                if(res.success) {
                    setData((old: any) => ([...old, res.data]))
                    setInsurance({description:'', issueDate: '', startDate: '', expiryDate: '', active: true, filename: '', thumbnail: ''})
                    onClose({}, "");
                }
                else {
                    // setSnackVariant('error');
                    // setSnackMessage(res.message);
                    console.log("Error Uploading Insurance Information", res)
                }
            }).catch((err) => {
                console.log("error:", err);
                // setSnackVariant('error');
                // setSnackMessage(res.message);
            }).finally(() => {
                setWaiting(false);
            });

        
    }

    const handleClose = () => {
        onClose({}, "");
    }

    const handleChange = (e: React.ChangeEvent<HTMLElementChange>) => {
        setInsurance(prev => ({...prev, [e.target.name]: e.target.value}))
    }

    return (
        <>
            <Dialog fullWidth maxWidth='md' open={open} onClose={onClose}>
                <DialogContent>
                    <span className="dialogTitle">
                        <h1
                            style={{display: 'inline-block', position: 'relative', left: '24px', width: 'calc(100% - 48px)', textAlign: 'center', fontWeight: 'bold'}}>
                            Add Insurance
                        </h1>
                        <IconButton onClick={handleClose} style={{float: 'right', right: '10px', padding: '0px 0px 4px 0px'}} >
                            <CloseIcon />
                        </IconButton>
                    </span>
                    <Grid container spacing={1} 
                        direction={'column'}
                        alignItems={'center'}
                    >
                        <Grid item xs={12} style={{margin: '10px 0px', overflow: 'hidden auto'}}>
                            <Typography variant='h6'></Typography>
                            <Grid item xs={12}>
                                <InputField type="text" width={450} label="Description" name="description" 
                                    error={fieldError['description']} value={insurance.description} onChange={handleChange}/> 
                                <InputField type="date" width={150} label="Issue Date" name="issueDate" 
                                    error={fieldError['issueDate']} value={insurance.issueDate} onChange={handleChange}/> 
                            </Grid>
                            <Grid item xs={12}>
                                <InputField type="date" width={150} label="Start Date" name="startDate" 
                                    error={fieldError['startDate']} value={insurance.startDate} onChange={handleChange}/> 
                                <InputField type="date" width={150} label="Expiry Date" name="expiryDate" 
                                    error={fieldError['expiryDate']} value={insurance.expiryDate} onChange={handleChange}/> 
                            </Grid>
                            <Grid item xs={12}>
                                <div style={{display: 'flex', justifyContent: 'center'}}>
                                    <ProgressButton name="Submit" waiting={waiting} onClick={handleSubmit} buttonVariant="outlined"/>
                                </div>
                            </Grid>
                        </Grid>
                        <Grid item xs={12} style={{display: 'flex', justifyContent: 'center'}}>
                            <div className='pdf-preview'>
                                <img src={"\\" + newInsurance.thumbnail} alt="PDF Preview" className='pdf-img'/>
                            </div>
                        </Grid>
                    </Grid>
                </DialogContent>
            </Dialog>
        </>
    )
}

export default Insurances;