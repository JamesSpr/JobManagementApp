import React, { useState, useEffect } from 'react';
import PropTypes from 'prop-types';
import { Box, Tab, Tabs } from '@mui/material';
import EstimateTable from './Table';
import EstimateOptionsOverview from './Overview';
import NewEstimate from './NewEstimate';
import useEstimate from './useEstimate';
import useAxiosPrivate from '../../../hooks/useAxiosPrivate';

const TabPanel = ({ children, value, index, ...other }) => (
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

TabPanel.propTypes = {
    children: PropTypes.node,
    index: PropTypes.number.isRequired,
    value: PropTypes.number.isRequired,
}

const EstimateModule = ({ estimates, jobId, updateRequired, users, bills, client }) => {

    const axiosPrivate = useAxiosPrivate();
    const { estimateSet } = useEstimate();
    const [estimateData, setEstimateData] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [value, setValue] = useState(0); // Active Tab Value
    const [selected, setSelected] = useState(false);
    const [creating, setCreating] = useState(false);
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

    
    useEffect(() => {
        setIsLoading(false);

        if(estimates) {
            estimates?.map((estimateOption) => {
                setEstimateData(oldArray => [...oldArray, estimateOption]);
            })
        }
    
    }, [estimates])

    useEffect(() => {
        if(estimateSet.length > 0) {
            setEstimateData(estimateSet);
        }
        setSelected(false);
    }, [estimateSet])

    const a11yProps = (index, selected) => {
        return {
            id: `simple-tab-${index}`,
            'aria-controls': `simple-tabpanel-${index}`,
            disabled: creating ? false : selected,
        }
    }

    const handleLockEstimate = (accessor) => {
        if(!estimateData[accessor]['approvalDate']) {
            setSelected(true)
        }
    }

    return(
        //<HotKeys keyMap={keyMap}>
            <Box sx={{width: '100%', borderBottom: 1, borderColor: 'divider' }}>
                {!isLoading ? 
                <>
                    <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                        <Tabs value={value} onChange={ (event, newValue) => {setValue(newValue); setCreating(false);}} indicatorColor="primary" centered>
                            <Tab label={'Quote Options'} {...a11yProps(0, selected)}/>
                            {estimateData.map((item, index) => {
                                return (
                                    <Tab label={estimateData[index]?.name} {...a11yProps(index+1, selected)}/>
                                );
                            })}
                            <Tab label="+" onClick={() => {setCreating(true);}} {...a11yProps(estimateData?.length, selected)}/>
                        </Tabs>
                    </Box>
                    
                    <TabPanel key={0} value={value} index={0}>
                        {estimateData ? <EstimateOptionsOverview users={users} jobId={jobId} updateRequired={updateRequired} bills={bills} contractors={contractors} client={client}/> : <p>Loading...</p> }
                    </TabPanel>
                    {estimateData.map((item, accessor) => {
                        let index = accessor + 1;
                        return (
                            <TabPanel key={index} value={value} index={index} onClick={() => {handleLockEstimate(accessor)}}>
                                {estimateData[accessor] ? <EstimateTable estimateData={estimateData[accessor]} users={{users}} accessorId={accessor} /> : <p>Loading...</p> }
                            </TabPanel>
                        )
                    })}
                    <TabPanel key={estimateData.length + 1} value={value} index={estimateData?.length + 1}>
                        <NewEstimate users={users} setEstimateData={setEstimateData}/>
                    </TabPanel>
                </>
                : <p>Loading...</p> }                
            </Box>            
        //</HotKeys>
    )
}

export default EstimateModule;