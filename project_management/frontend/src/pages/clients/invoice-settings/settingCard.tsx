import React from 'react'
import { InputField } from '../../../components/Components'
import { InvoiceSettingType } from './settings'

const SettingCard = ({settings, setSettings}: {
    settings: InvoiceSettingType
    setSettings: React.Dispatch<React.SetStateAction<InvoiceSettingType>>
}) => {

    const handleChangeText = (e: { target: { name?: any; value?: any; };} ) => {
        setSettings(prev => ({...prev, [e.target.name]: e.target.value}))
    }

    return (<>
        <div className="setting-card-wrapper">
            <div>
                <InputField type='text' name='name' value={settings.name} onChange={handleChangeText} />
            </div>
        </div>
    </>)
}

export default SettingCard