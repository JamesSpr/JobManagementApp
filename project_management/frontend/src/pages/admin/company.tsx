import React, { FC, ReactNode, useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import useAuth from "../auth/useAuth";
import { Box, Tab, Tabs, Grid, Dialog, DialogContent, Typography, IconButton } from '@mui/material';
import { ColumnDef } from "@tanstack/table-core";
import { FileUploadSection, InputField, PaginatedTable, ProgressButton } from "../../components/Components";
import { HTMLElementChange } from "../../types/types";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

type TabPanelProps = {
    children: ReactNode,
    index: number,
    value: number
}

const TabPanel:FC<TabPanelProps> = ({ children, value, index, ...other }) => (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
)

// This is the administration page for a company. 
// Company admins can modify employee permissions
const CompanyAdmin = () => {
    const { auth } = useAuth();
    const navigate = useNavigate();

    const [value, setValue] = useState(2); // Active Tab Value

    useEffect(() => {
        if(!auth || !auth?.user.company) {
            navigate('/missing', { replace: true, state: {missing: "company"} });
        }

    }, [])

    const tabOptions = ["Home", "Employees", "Insurances"]
    const a11yProps = (index: number) => {
        return {
            id: `simple-tab-${index}`,
            'aria-controls': `simple-tabpanel-${index}`,
        }
    }

    return (
    <>
        <h2 style={{textAlign: "center", paddingBottom: '15px'}}>Company Admin Page for {auth?.user?.company?.name}</h2>
        <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <Tabs value={value} onChange={ (event, newValue) => {setValue(newValue)}} indicatorColor="primary" centered>
                <Tab label={'About'} {...a11yProps(0)}/>
                <Tab label={'Employees'} {...a11yProps(1)}/>
                <Tab label={'Insurances'} {...a11yProps(2)}/>
            </Tabs>
        </Box>
        
        <TabPanel key={0} value={value} index={0}>
            <About />
        </TabPanel>         
        <TabPanel key={1} value={value} index={1}>
            <Employees />
        </TabPanel>         
        <TabPanel key={2} value={value} index={2}>
            <Insurances />
        </TabPanel>     
    </>    

    )
}

const About = () => {
    return (
        <>
            <Grid container
                direction={'column'}
                alignItems={'center'}
            >
                <Grid item xs={12}>
                    <p>Name</p>
                    <p>Logo</p>
                    <p>Other Settings</p>
                </Grid>
            </Grid>
        </>
    )
}

const Employees = () => {
    return (
        <>
            <Grid container
                direction={'column'}
                alignItems={'center'}
            >
                <Grid item xs={12}>
                    <p>Employee Permissions</p>

                </Grid>
            </Grid>
        </>
    )
}

interface InsuranceDataType {
    id: string
    description: string
    start: Date
    expiry: Date
    active: boolean
    thumbnail: string
}

const Insurances = () => {

    const previewInsurance = (thumbnail: string) => {
        console.log(thumbnail)
    }

    const columns = useMemo<ColumnDef<InsuranceDataType>[]>(() => [
        {
            accessorKey: 'description',
            header: () => "Description",
            cell: info => info.getValue(),
            size: 200,
        },
        {
            accessorKey: 'start',
            header: () => "Start Date",
            cell: info => info.getValue().toDateString(),
            size: 150,
        },
        {
            accessorKey: 'expiry',
            header: () => "Expiry Date",
            cell: info => info.getValue().toDateString(),
            size: 150,
        },
        {
            accessorKey: 'active',
            header: () => "Active",
            cell: info => {
                const [checked, setChecked] = useState(info.getValue());

                return (
                    <input type="checkbox" checked={checked} onChange={() => {setChecked(!checked)}} /> 
                )
            },
            size: 80,
        },
        {
            accessorKey: 'thumbnail',
            header: () => "Preview",
            cell: info => {
                if(info.getValue() == "") return (<></>)
                return(
                    <IconButton onClick={() => previewInsurance(info.getValue())}>
                        <PictureAsPdfIcon />
                    </IconButton> 
                )
            },
            size: 80,
        },
    ], [] )

    const axiosPrivate = useAxiosPrivate();
    const [data, setData] = useState<InsuranceDataType[]>([{id: '', description: "Public and Products Liability", start: new Date(), expiry: new Date(), active: false, thumbnail: ''}])
    const [newInsurancePath, setNewInsurancePath] = useState('');
    const [waiting, setWaiting] = useState({update: false})
    
    const [newDialog, setNewDialog] = useState(false);

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
                console.log(res);
                if(res.success) {
                    setNewInsurancePath(res.thumbnailPath);
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
    }

    const updateInsurances = () => {
        setWaiting(prev => ({...prev, update: true}))
    }

    return (
        <>
            <Grid container
                direction={'column'}
                alignItems={'center'}
            >
                <Grid item xs={12}>
                    <p>Insurances Information/Details</p>
                    <PaginatedTable columns={columns} data={data} />
                    <p>Upload Insurances</p>
                    <FileUploadSection onSubmit={handleNewInsurance} waiting={waiting.update} id="upload_insurances" type=".pdf" button="Upload Insurances"/>
                </Grid>
            </Grid>

            <NewInsurance open={newDialog} onClose={handleClose} newInsurance={newInsurancePath} data={data} setData={setData}/>
        </>
    )
}

const NewInsurance = ({ open, onClose, newInsurance, data, setData }: {open: boolean, onClose: (event: {}, reason: string) => void, newInsurance: string, data: {}, setData: (value: InsuranceDataType[]) => void}) => {

    const axiosPrivate = useAxiosPrivate()
    const [insurance, setInsurance] = useState({description:'', expiryDate: '', active: true});
    const [fieldError, setFieldError] = useState({description: false, expiryDate: false});
    const [waiting, setWaiting] = useState(false);

    const handleSubmit = async () => {
        setWaiting(true);

        await axiosPrivate({
                method: 'post',
                data: JSON.stringify({
                    query: `
                    mutation ($file: String!) {
                        save: pdfToImage(file: $file) {
                            success
                            path
                        }
                    }`,
                    variables: {
                        file: data,
                    },
                }),
            }).then((response) => {
                const res = response?.data?.data?.save;
                if(res.success) {
                    
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
                                <InputField type="text" width={300} label="Description" name="description" 
                                    error={fieldError['description']} value={insurance.description} onChange={handleChange}/> 
                                <InputField type="date" width={200} label="Expiry Date" name="expiryDate" 
                                    error={fieldError['expiryDate']} value={insurance.expiryDate} onChange={handleChange}/> 
                            </Grid>
                            <Grid item xs={12}>
                                <div style={{display: 'flex', justifyContent: 'center'}}>
                                    <ProgressButton name="Submit" waiting={waiting} onClick={() => handleSubmit} buttonVariant="outlined"/>
                                </div>
                            </Grid>
                        </Grid>
                        <Grid item xs={12} style={{display: 'flex', justifyContent: 'center'}}>
                            <div className='pdf-preview-large'>
                                <img src={"\\" + newInsurance} alt="PDF Preview"/>
                            </div>
                        </Grid>
                    </Grid>
                </DialogContent>
            </Dialog>
        </>
    )
}



export default CompanyAdmin;