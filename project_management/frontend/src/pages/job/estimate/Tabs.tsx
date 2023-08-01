import React, { useState, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Box, Tab, Tabs } from '@mui/material';
import EstimateTable from './Table';
import EstimateOptionsOverview from './Overview';
import NewEstimate from './NewEstimate';
// import useEstimate from './useEstimate';
import useAxiosPrivate from '../../../hooks/useAxiosPrivate';
import { BillType, ClientType, EmployeeType, JobType, SnackType } from '../../../types/types';

interface TabPanelProps {
    children: React.ReactNode;
    index: number;
    value: number;
}

const TabPanel = ({ children, value, index, ...other }:TabPanelProps) => (
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

const EstimateModule = ({ job, setJob, updateRequired, setUpdateRequired, users, snack, setSnack }: {
    job: JobType,
    setJob: React.Dispatch<React.SetStateAction<JobType>>
    updateRequired: boolean
    setUpdateRequired: React.Dispatch<React.SetStateAction<boolean>>
    users: EmployeeType[]
    snack: SnackType
    setSnack: React.Dispatch<React.SetStateAction<SnackType>>
}) => {

    const axiosPrivate = useAxiosPrivate();
    const [value, setValue] = useState(0); // Active Tab Value
    const [contractors, setContractors] = useState([]);

    useEffect(() => {
        const controller = new AbortController();

        const fetchData = async () => {
            await axiosPrivate({
                method: 'post',
                signal: controller.signal,
                data: JSON.stringify({
                query: `{
                    contractors {
                        id
                        name
                        abn
                        bankAccountName
                        bsb
                        bankAccountNumber
                    }
                }`,
                variables: {  },
            }),
            }).then((response) => {
                console.log(response);
                const res = response?.data?.data?.contractors;
                setContractors(res);
            }).catch((err) => {
                // TODO: handle error
                if(err.name === "CanceledError") {
                    return
                }
                console.log("Error:", err);
            });
        }

        fetchData();
        
        return () => {
            controller.abort();
        } 
    }, [])

    const a11yProps = (index: number) => {
        return {
            id: `simple-tab-${index}`,
            'aria-controls': `simple-tabpanel-${index}`,
        }
    }

    return(
        <Box sx={{width: '100%', borderBottom: 1, borderColor: 'divider' }}>
            <>
                <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs value={value} onChange={ (event, newValue) => {setValue(newValue)}} indicatorColor="primary" centered>
                        <Tab label={'Quotes'} {...a11yProps(0)}/>
                        {job.estimateSet.map((item, index) => {
                            return (
                                <Tab label={job.estimateSet[index]?.name} {...a11yProps(index+1)}/>
                            );
                        })}
                        <Tab label="+" {...a11yProps(job.estimateSet?.length)}/>
                    </Tabs>
                </Box>


                {/* {TabPanels} */}

                <TabPanel key={0} value={value} index={0}>
                    {job.estimateSet && 
                        <EstimateOptionsOverview users={users} job={job} setJob={setJob} updateRequired={updateRequired} 
                        setUpdateRequired={setUpdateRequired} contractors={contractors} 
                        setSnack={setSnack} />
                    }
                </TabPanel>
                    {job.estimateSet.map((item, accessor) => {
                        let index = accessor + 1;
                        return (
                            <TabPanel key={index} value={value} index={index}>
                                {job.estimateSet[accessor] && 
                                    <EstimateTable job={job} setJob={setJob} accessorId={accessor} 
                                    setUpdateRequired={setUpdateRequired} setSnack={setSnack}
                                    /> 
                                }
                            </TabPanel>
                        )
                    })}
                <TabPanel key={job.estimateSet.length + 1} value={value} index={job.estimateSet?.length + 1}>
                    <NewEstimate job={job} setJob={setJob} users={users} snack={snack} setSnack={setSnack}/>
                </TabPanel>
                
            </> 
        </Box>    
    )
}

export default EstimateModule;

// export default () => '';