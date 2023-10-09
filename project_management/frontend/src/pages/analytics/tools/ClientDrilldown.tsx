import { Grid } from "@mui/material";
import { ResponsiveContainer, BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, } from "recharts";


const ClientDrilldown = () => {

    const jobAmountData = [
        {
            name: 'BGIS',
            RIC: 777,
            FBE: 365,
            SCM: 287,
            LMA: 56,
            SME: 5,
            SMA: 4,
        },
        {
            name: 'Catholic Schools',
            BB: 27,
        },
        {
            name: 'CDC',
            EC: 1
        }
    ]
    
    const jobTurnoverData = [
        {
            name: 'BGIS',
            RIC: 3258879.83,
            FBE: 2324872.86,
            SCM: 1235578.09,
            LMA: 846850.75,
            SME: 14229.00,
            SMA: 24069.50,
        },
        {
            name: 'Catholic Schools',
            BB: 109263.47,
        },
        {
            name: 'CDC',
            EC: 0
        }
    ]

    return (<>
    <Grid container spacing={1} 
        direction="column"
    >

        {/* <h2>Job Stats</h2>
        <ul>
            <li>Number of Jobs per Client</li>
            <li>Number of Jobs per Client Region</li>
            <li>Turnover/Profit per Client</li>
            <li>Turnover/Profit Per Client Region</li>
        </ul>
        <p><a href="https://codesandbox.io/examples/package/react-chartjs-2">Example use of react-chartjs-2</a></p>
        <p><a href="https://codesandbox.io/s/github/ed-roh/react-admin-dashboard/tree/master/">React Admin</a></p>
        <p><a href="https://codesandbox.io/s/react-6qgyt?file=/src/index.js">Flowchart</a></p> */}


        <ResponsiveContainer width={800} height={500}>
            <BarChart
                width={800}
                height={500}
                data={jobAmountData}
                syncId={1}
                margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="RIC" stackId="a" fill="#8884d8" />
                <Bar dataKey="FBE" stackId="a" fill="#82ca9d" />
                <Bar dataKey="SCM" stackId="a" fill="#fcba03" />
                <Bar dataKey="LMA" stackId="a" fill="#03fc03" />
                <Bar dataKey="SME" stackId="a" fill="#035efc" />
                <Bar dataKey="SMA" stackId="a" fill="#fc0356" />
                <Bar dataKey="BB" stackId="a" fill="#035efc" />
                <Bar dataKey="EC" stackId="a" fill="#fc0356" />
            </BarChart>
      </ResponsiveContainer>

        <ResponsiveContainer width={800} height={500}>
            <BarChart
                width={800}
                height={500}
                data={jobTurnoverData}
                syncId={1}
                margin={{
                    top: 20,
                    right: 30,
                    left: 20,
                    bottom: 5,
                }}
            >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="RIC" stackId="a" fill="#8884d8" />
                <Bar dataKey="FBE" stackId="a" fill="#82ca9d" />
                <Bar dataKey="SCM" stackId="a" fill="#fcba03" />
                <Bar dataKey="LMA" stackId="a" fill="#03fc03" />
                <Bar dataKey="SME" stackId="a" fill="#035efc" />
                <Bar dataKey="SMA" stackId="a" fill="#fc0356" />
                <Bar dataKey="BB" stackId="a" fill="#035efc" />
                <Bar dataKey="EC" stackId="a" fill="#fc0356" />
            </BarChart>
      </ResponsiveContainer>
    </Grid>
    </>)
}

export default ClientDrilldown;