import React, { FC, ReactNode, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import useAuth from "../auth/useAuth";
import { Box, Tab, Tabs, Grid } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';

import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import Insurances from "./Insurances";
import Employees from "./Employees";
import { EmployeeType, InsuranceType, MYOBUserType, SnackType } from "../../types/types";
import { Footer, ProgressIconButton, SnackBar } from "../../components/Components";


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
    const [insurances, setInsurances] = useState<InsuranceType[]>([])
    const [employees, setEmployees] = useState<EmployeeType[]>([])
    const [myobUsers, setMyobUsers] = useState<MYOBUserType[]>([])
    const [userRoles, setUserRoles] = useState<string[]>([])
    
    const [snack, setSnack] = useState<SnackType>({variant: 'info', active: false, message: ''});

    const [updateRequired, setUpdateRequired] = useState(false);
    const [waiting, setWaiting] = useState(false);

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
                                    isStaff
                                    isActive
                                }
                            }
                        }
                        myobUsers {
                            id
                            username
                        }
                        __type(name:"CustomUserRole"){
                            name
                            enumValues {
                                name
                                description
                            }
                        }
                    }`,
                    variables: {},
                }),
            }).then((response) => {
                const res = response?.data?.data; 
                console.log(res);
                
                setInsurances(res.insurances);
                const employees = res.users.edges.map((emp: any) => {return emp?.node});
                setEmployees(employees);
                setMyobUsers(res.myobUsers);
                setUserRoles(res.__type.enumValues)
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

    const handleSave = async () => {
        setWaiting(true);

        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                mutation updateCompany($employees: [UserInputType]!, $insurances: [InsuranceInputType]!) {
                    update: updateCompany(employees: $employees, insurances: $insurances) {
                        success
                        message
                    }
                }`,
                variables: {
                    employees: employees,
                    insurances: insurances
                },
        }),
        }).then((response) => {
            console.log(response)
            const res = response?.data?.data?.update; 
            
            setWaiting(false);

            if(res.success) {
                console.log("Response", res.invoices)
                setUpdateRequired(false);
                setSnack({'active': true, variant:'success', message: res.message})
            }
            else {
                console.log(res.error)
                setSnack({'active': true, variant:'error', message: res.message})
            }

        }).catch((err) => {
            console.log("error:", err);
            setSnack({'active': true, variant:'error', message: 'Error Connecting to Server. Please try again or contact admin.'})
        });

    }
    
    const [tabValue, setTabValue] = useState(1); // Active Tab Value
    const tabLabels = ["Home", "Employees", "Insurances"]
    const tabPanels = [
        <About />,
        <Employees employees={employees} setEmployees={setEmployees} 
            userRoles={userRoles}
            setUpdateRequired={setUpdateRequired} myobUsers={myobUsers} />,
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
            ))}

            <Footer>
                <ProgressIconButton onClick={handleSave} waiting={waiting} disabled={!updateRequired}><SaveIcon /></ProgressIconButton>
            </Footer>
            

            <SnackBar snack={snack} setSnack={setSnack} />
            </>
        
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