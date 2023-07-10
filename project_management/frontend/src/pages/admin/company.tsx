import React, { FC, ReactNode, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import useAuth from "../auth/useAuth";
import { Box, Tab, Tabs, Grid } from '@mui/material';

import Insurances from "./Insurances";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import { EmployeeType, InsuranceType, MYOBUserType } from "../../types/types";
import Employees from "./Employees";

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

    const axiosPrivate = useAxiosPrivate();
    const [loading, setLoading] = useState(true);
    const [updateRequired, setUpdateRequired] = useState(false);
    const [insurances, setInsurances] = useState<InsuranceType[]>([])
    const [employees, setEmployees] = useState<EmployeeType[]>([])
    const [myobUsers, setMyobUsers] = useState<MYOBUserType[]>([])

    useEffect(() => {
        const controller = new AbortController();

        if(!auth || !auth?.user.company) {
            navigate('/missing', { replace: true, state: {missing: "company"} });
            return
        }

        const fetchData = async () => {
            await axiosPrivate({
                method: 'post',
                signal: controller.signal,
                data: JSON.stringify({
                    query: `
                    query {
                        insurances {
                            id
                            description
                            issueDate
                            startDate
                            expiryDate
                            active
                            thumbnail
                        }
                        users {
                            edges {
                                node {
                                    id
                                    firstName
                                    lastName
                                    email
                                    position
                                    myobAccess
                                    myobUser {
                                        id
                                        username
                                    }
                                    role
                                    isActive
                                }
                            }
                        }
                        myobUsers {
                            id
                            username
                        }
                    }`,
                    variables: {},
                }),
            }).then((response) => {
                const res = response?.data?.data; 
                
                setInsurances(res.insurances);
                const employees = res.users.edges.map((emp: any) => {return emp?.node});
                setEmployees(employees);
                setMyobUsers(res.myobUsers);
            }).catch((err) => {
                console.log("error fetching data:", err);
            }).finally(() => {
                // Stop Loading
                setLoading(false);
            });
        }

        fetchData();
        
        return () => {
            controller.abort();
            // Stop Loading
        }

    }, [])

    
    const [tabValue, setTabValue] = useState(1); // Active Tab Value
    const tabLabels = ["Home", "Employees", "Insurances"]
    const tabPanels = [
        <About />,
        <Employees employees={employees} setEmployees={setEmployees} setUpdateRequired={setUpdateRequired} myobUsers={myobUsers} />,
        <Insurances insurances={insurances} setInsurances={setInsurances} setUpdateRequired={setUpdateRequired}/>,
    ]
    const a11yProps = (index: number) => {
        return {
            id: `simple-tab-${index}`,
            'aria-controls': `simple-tabpanel-${index}`,
        }
    }

    return (
    <>
        {/* <h2 style={{textAlign: "center", paddingBottom: '15px'}}>Company Admin Page for {auth?.user?.company?.name}</h2> */}
        {/* <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
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
            <Employees employees={employees} setEmployees={setEmployees} updateRequired={updateRequired} setUpdateRequired={setUpdateRequired}/>
        </TabPanel>         
        <TabPanel key={2} value={value} index={2}>
            <Insurances insurances={insurances} setInsurances={setInsurances} updateRequired={updateRequired} setUpdateRequired={setUpdateRequired}/>
        </TabPanel>      */}
        {!loading && <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={ (event, val) => {setTabValue(val)}} indicatorColor="primary" centered>
                    {tabLabels.map((name, i) => (
                        <Tab label={name} {...a11yProps(i)} />
                    ))}
                </Tabs>
            </Box>
            
            {tabPanels.map((item, i) => (
                <TabPanel key={i} value={tabValue} index={i}>
                    {item}
                </TabPanel>        
            ))}</>
        }
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



export default CompanyAdmin;