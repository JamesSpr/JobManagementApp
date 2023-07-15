import React, { FC, ReactNode, useState, useEffect, useMemo } from "react";
import { Box, Tab, Tabs, Grid, Dialog, DialogContent, Typography, IconButton } from '@mui/material';
import { ColumnDef } from "@tanstack/table-core";
import { FileUploadSection, InputField, Table, ProgressButton, useSkipper } from "../../components/Components";
import { EmployeeType, HTMLElementChange, MYOBUserType } from "../../types/types";
import useAxiosPrivate from "../../hooks/useAxiosPrivate";

import CloseIcon from '@mui/icons-material/Close';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';

const Employees = ({employees, setEmployees, setUpdateRequired, myobUsers}:{
    employees: EmployeeType[]
    setEmployees: React.Dispatch<React.SetStateAction<EmployeeType[]>>,
    setUpdateRequired: React.Dispatch<React.SetStateAction<boolean>>,
    myobUsers: MYOBUserType[]
}) => {

    const EditableCell = ({ getValue, row: { index }, column: { id }, table }: 
        { getValue: any, row: { index: any }, column: { id: any }, table: any }) => {
        const initialValue = getValue()
        // We need to keep and update the state of the cell normally
        const [value, setValue] = useState(initialValue)

        // When the input is blurred, we'll call our table meta's updateData function
        const onBlur = () => {
            if(initialValue !== value) {
                setUpdateRequired(true);
                table.options.meta?.updateData(index, id, value)
            }
        }

        // If the initialValue is changed external, sync it up with our state
        useEffect(() => {
            setValue(initialValue)
        }, [initialValue])

        return (
            <input className="dataTableInput" value={value as any} onChange={e => setValue(e.target.value)} onBlur={onBlur} />
        )
    }

    const SelectionCell = ({ getValue, row: {index}, column: { id }, table }:
    { getValue: any, row: { index: any }, column: { id: any }, table: any }) => {
        const initialValue = getValue()
        // We need to keep and update the state of the cell normally
        const [value, setValue] = useState(initialValue)
        const [data, setData] = useState<MYOBUserType[]>([])
        
        // When the input is blurred, we'll call our table meta's updateData function
        const onSelection = (e: { target: { value: any; }; }) => {
            setValue(e.target.value)
            if(initialValue !== value) {
                setUpdateRequired(true);
                table.options.meta?.updateData(index, id, value);
            }
        }
        
        // If the initialValue is changed external, sync it up with our state
        useEffect(() => {
            setValue(initialValue)
        }, [initialValue])

        useEffect(() => {
            setData(table.options.meta?.getMyobUsers())
        }, [])

        return (
            <select value={value} onChange={onSelection}
                style={{display:'block', margin:'0 auto', width: 'calc(100% - 3px)', padding: '5px', fontSize: '0.875rem'}}
            >
                <option key={'blank'} value=''>{''}</option>
                {data?.map((user: any) => (
                    <option key={user.id} value={user.id}>{user.username}</option>
                ))}
            </select>
        )
    }

    const columns = useMemo<ColumnDef<EmployeeType>[]>(() => [
        {
            accessorKey: 'email',
            header: () => "Username",
            cell: EditableCell,
            size: 250,
        },
        {
            accessorKey: 'firstName',
            header: () => "First Name",
            cell: EditableCell,
            size: 150,
        },
        {
            accessorKey: 'lastName',
            header: () => "Last Name",
            cell: EditableCell,
            size: 150,
        },
        {
            accessorKey: 'isActive',
            header: () => "Active",
            cell: info => {
                const [checked, setChecked] = useState(info.getValue());

                return (
                    <input type="checkbox" checked={checked as boolean} onChange={() => {setChecked(!checked)}} /> 
                )
            },
            size: 80,
        },
        {
            id: 'myobUser',
            accessorFn: row => row?.myobUser?.id ?? '',
            header: () => "MYOB Access",
            cell: SelectionCell,
            size: 300,
        },
        {
            accessorKey: 'myobAccess',
            header: () => "MYOB Access",
            cell: info => {
                const [checked, setChecked] = useState(info.getValue());

                return (
                    <input type="checkbox" checked={checked as boolean} onChange={() => {setChecked(!checked)}} /> 
                )
            },
            size: 80,
        }
    ], [])

    const [autoResetPageIndex, skipAutoResetPageIndex] = useSkipper()
    const tableMeta = {
        updateData: (rowIndex: number, columnId: any, value: any) => {
            // setUpdateRequired(true);
            skipAutoResetPageIndex()
            setEmployees(old => old.map((row, index) => {
                if(index === rowIndex) {
                    return {
                        ...old[rowIndex],
                        [columnId]: value,
                    }
                }
                return row;
            }));
        },
        getMyobUsers: () => {
            return myobUsers;
        },
    }

    return (
        <>
            <Grid container
                direction={'column'}
                alignItems={'center'}
            >
                <Grid item xs={12}>
                    <p>Employee Permissions</p>

                </Grid>
                <Grid item xs={12}>
                    <Table data={employees} setData={setEmployees} columns={columns} tableMeta={tableMeta} autoResetPageIndex={autoResetPageIndex} pagination={true} />
                </Grid>
            </Grid>
        </>
    )
}

export default Employees;