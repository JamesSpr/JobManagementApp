import React, { FC, ReactNode, useState, useEffect } from "react";
import { useNavigate } from "react-router";
import useAuth from "../auth/useAuth";
import { Box, Tab, Tabs, Grid } from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';

import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import Insurances from "./Insurances";
import Employees from "./Employees";
import { CompanyInformationType, EmployeeType, InsuranceType, MYOBCompanyFileType, MYOBUserType, SnackType } from "../../types/types";
import { Footer, InputField, ProgressIconButton, SnackBar } from "../../components/Components";


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
    const [companyInformation, setCompanyInformation] = useState<CompanyInformationType>({id: '', name: '', defaultMyobFile: {id: ''}, defaultMyobAccount: {id: ''}})
    const [employees, setEmployees] = useState<EmployeeType[]>([])
    const [myobUsers, setMyobUsers] = useState<MYOBUserType[]>([])
    const [userRoles, setUserRoles] = useState<string[]>([])
    const [insurances, setInsurances] = useState<InsuranceType[]>([])
    const [companyFiles, setCompanyFiles] = useState<MYOBCompanyFileType[]>([])
    
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
                        myCompany {
                            id
                            name
                            defaultMyobFile {
                                id
                            }
                            defaultMyobAccount {
                                id
                            }
                        }
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
                        companyFiles {
                            id
                            companyName
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
                setCompanyInformation(res.myCompany);
                const employees = res.users.edges.map((emp: any) => {return emp?.node});
                setEmployees(employees);
                setMyobUsers(res.myobUsers);
                setCompanyFiles(res.companyFiles);
                setUserRoles(res.__type.enumValues);
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
                mutation updateCompany($companyInfo: CompanyInputType!, $employees: [UserInputType]!, $insurances: [InsuranceInputType]!) {
                    update: updateCompany(companyInfo: $companyInfo, employees: $employees, insurances: $insurances) {
                        success
                        message
                    }
                }`,
                variables: {
                    companyInfo: companyInformation,
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
        <About companyInformation={companyInformation} setCompanyInformation={setCompanyInformation} 
            setUpdateRequired={setUpdateRequired} companyFiles={companyFiles}/>,
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

const About = ({companyInformation, setCompanyInformation, setUpdateRequired, companyFiles}: {
    companyInformation: CompanyInformationType
    setCompanyInformation: React.Dispatch<React.SetStateAction<CompanyInformationType>>
    setUpdateRequired: React.Dispatch<React.SetStateAction<boolean>>
    companyFiles: MYOBCompanyFileType[]
}) => {

    useEffect(() => {
        console.log(companyInformation);
    }, [])

    const onChange = (e: { target: { name: any; value: any; }; }) => {
        if(companyInformation[e.target.name as keyof CompanyInformationType] != e.target.value) {
            setCompanyInformation(prev => ({...prev, [e.target.name]: e.target.value}))
            setUpdateRequired(true)
        }
    }

    const onChangeID = (e: { target: { name: any; value: any; }; }) => {
        setCompanyInformation(prev => ({...prev, [e.target.name]: {id: e.target.value}}))
        setUpdateRequired(true)
    }

    return (
        <>
            <Grid container
                direction={'column'}
                alignItems={'center'}
            >
                <Grid item xs={12}>
                    <InputField type="text" label="Name" name="name" value={companyInformation.name} onChange={onChange} />
                    <p>Logo</p>
                    <p>Other Settings</p>
                    <InputField type="select" label="MYOB Company File" name="defaultMyobFile" 
                        value={companyInformation.defaultMyobFile.id} onChange={onChangeID}>
                        <option key="nullCompanyFile" value=""></option>
                        {companyFiles.map((cf) => (
                            <option key={cf.id} value={cf.id}>{cf.companyName}</option>
                        ))}
                    </InputField>
                </Grid>
            </Grid>
        </>
    )
}



export default CompanyAdmin;