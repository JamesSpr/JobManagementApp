import React, { FC, ReactNode, useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import useAuth from "../auth/useAuth";
import { Box, Tab, Tabs, Grid, Dialog, DialogContent, Typography, IconButton } from '@mui/material';
import { ColumnDef } from "@tanstack/table-core";
import { FileUploadSection, InputField, PaginatedTable, ProgressButton } from "../../components/Components";
import CloseIcon from '@mui/icons-material/Close';
import { HTMLElementChange } from "../../types/types";

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
    description: string
    expiry: Date
    active: boolean
}

const Insurances = () => {

    const columns = useMemo<ColumnDef<InsuranceDataType>[]>(() => [
        {
            accessorKey: 'description',
            header: () => "Description",
            cell: info => info.getValue(),
            size: 200,
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
    ], [] )

    const [data, setData] = useState<InsuranceDataType[]>([{description: "Public and Products Liability", expiry: new Date(), active: false}])
    const [newInsurance, setNewInsurance] = useState({thumbnailPath: ''});
    const [waiting, setWaiting] = useState({update: false})
    
    const [newDialog, setNewDialog] = useState(false);

    const handleNewInsurance = () => {

        // Post insurance to backend

        setNewInsurance({thumbnailPath: ''});

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
                    <p>Create or Update Insurances</p>
                    <FileUploadSection onSubmit={handleNewInsurance} waiting={waiting.update} id="update_insurances" type=".pdf" button="Upload Insurances"/>
                </Grid>
            </Grid>

            <NewInsurance open={newDialog} onClose={handleClose} newInsurance={newInsurance.thumbnailPath}/>
        </>
    )
}

const NewInsurance = ({ open, onClose, newInsurance }: {open: boolean, onClose: (event: {}, reason: string) => void, newInsurance: string}) => {

    const [insurance, setInsurance] = useState({description:'', expiryDate: '', active: true});
    const [fieldError, setFieldError] = useState({description: false, expiryDate: false});
    const [waiting, setWaiting] = useState(false);

    const handleSubmit = () => {
        setWaiting(true);
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
                                <InputField type="text" width={200} label="Description" name="description" 
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
                            <div className='pdf-preview'>
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