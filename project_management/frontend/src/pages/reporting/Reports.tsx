import React from 'react';

const Reports = () => {

    const generateFinancialReport = () => {
        
    }
    
    const generateWeeklyReport = () => {

    }

    return (<>
        <h1>Reports</h1>
        <button className='button' onClick={generateWeeklyReport}>Weekly Report</button>
        <button className='button' onClick={generateFinancialReport}>Financial Report</button>
    </>)
}

export default Reports;