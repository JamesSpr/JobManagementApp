import { useState, useEffect, useMemo, ReactNode } from "react";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";
import Cashflow from "./tools/Cashflow";
import ClientDrilldown from "./tools/ClientDrilldown";
import { Box, Tab, Tabs } from "@mui/material";

type TabPanelProps = {
    children: ReactNode,
    index: number,
    value: number
}

const TabPanel = ({ children, value, index, ...other }: TabPanelProps) => (
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

const Dashboard = () => {

    const [tabValue, setTabValue] = useState<number>(1)

    const tabOptions = ["Cashflow", "Client"]
    const tabItems = [
        <Cashflow />,
        <ClientDrilldown />
    ]

    const a11yProps = (index: number) => {
        return {
            id: `simple-tab-${index}`,
            'aria-controls': `simple-tabpanel-${index}`,
        }
    }

    return ( 
        <>
            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs value={tabValue} onChange={ (event, val) => {setTabValue(val)}} indicatorColor="primary" centered>
                    {tabOptions.map((name, i) => (
                        <Tab label={name} {...a11yProps(i)} />
                    ))}
                </Tabs>
            </Box>
            {tabItems.map((item, i) => (
                <TabPanel key={i} value={tabValue} index={i}>
                    {item}
                </TabPanel>        
            ))}

        </>
    )

}

export default Dashboard;