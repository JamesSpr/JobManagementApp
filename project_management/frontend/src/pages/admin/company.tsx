import React, { FC, ReactNode, useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import useAuth from "../auth/useAuth";
import { Box, Tab, Tabs, Grid } from '@mui/material';
import { ColumnDef } from "@tanstack/table-core";
import { PaginatedTable } from "../../components/Components";

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
            cell: info => info.getValue(),
            size: 80,
        },
    ], [] )

    const [data, setData] = useState<InsuranceDataType[]>([{description: "Certificate of Currency", expiry: new Date(), active: false}])

    return (
        <>
            <Grid container
                direction={'column'}
                alignItems={'center'}
            >
                <Grid item xs={12}>
                    <p>Insurances Information/Details</p>
                    <PaginatedTable columns={columns} data={data} />
                    <p>Add Insurances/Update</p>
                </Grid>
            </Grid>
        </>
    )
}



export default CompanyAdmin;