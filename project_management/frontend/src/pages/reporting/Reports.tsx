import React, { useState } from 'react';
import useAxiosPrivate from '../../hooks/useAxiosPrivate';
import { SnackType } from '../../types/types';
import { InputField, SnackBar } from '../../components/Components';

const Reports = () => {
    const axiosPrivate = useAxiosPrivate();
    const [data, setData] = useState({financialStart: undefined, financialEnd: undefined})
    const [waiting, setWaiting] = useState({financialReport: false});
    const [snack, setSnack] = useState<SnackType>({active: false, variant: 'info', message:''});

    const generateFinancialReport = async () => {
        setWaiting(prev => ({...prev, financialReport: true}))
        await axiosPrivate({
            method: 'post',
            data: JSON.stringify({
                query: `
                mutation generateFinancialReport($dateRange:[Date]!) {
                    report: generateFinancialReport(dateRange: $dateRange) {
                        success
                        message
                    }
                }`,
                variables: {
                    dateRange: [data.financialStart, data.financialEnd] 
                },
            }),
        }).then((response) => {
            console.log(response);
            const res = response?.data?.data?.report;

            setSnack({active: true, variant: res.success ? 'success' : 'error', message: res.message})
            
        }).catch((e) => {
            console.log("error", e);
            setSnack({active: true, variant: 'error', message: "Error Creating Contractor"})
        }).finally(() => {        
            setWaiting(prev => ({...prev, financialReport: false}))
        }); 
    }
    
    const generateWeeklyReport = () => {

    }

    const onValueChange = (e: { target: { name: any; value: any; }; }) => {
        setData(prev => ({...prev, [e.target.name]: e.target.value}))
    }

    return (<>
        <h1>Reports</h1>
        <div>
            <button className='button' onClick={generateWeeklyReport}>Weekly Report</button>
        </div>
        <div>
            <InputField type="date" name='financialStart' value={data.financialStart} onChange={onValueChange} />
            <InputField type="date" name='financialEnd' value={data.financialEnd} onChange={onValueChange} min={data.financialStart}/>
            <button className='button' onClick={generateFinancialReport}>Financial Report</button>
        </div>

        <SnackBar snack={snack} setSnack={setSnack} />
    </>)
}

export default Reports;