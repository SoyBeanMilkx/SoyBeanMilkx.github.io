import './index.sass'
import {
    ColorPicker,
    Form,
    Input, message,
    Modal, Popconfirm,
    Space,
    Table,
    TableProps,
    Tag,
} from "antd";
import React, {useEffect, useState} from "react";
import {FolderOpenOutlined, QuestionCircleOutlined} from '@ant-design/icons';
import {CategoriesType} from "../../../../interface/CategoriesType";
import {fetchCategories} from "../../../../store/components/categories.tsx";
import {useDispatch, useSelector} from "react-redux";
import {Fab} from "@mui/material";
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import DeleteForeverIcon from "@mui/icons-material/DeleteForever";
import {
    addCategory,
    delAllCategory,
    delCategory,
    getCategories,
    updateCategory
} from "../../../../apis/CategoryMethods.tsx";
const  AllCategorize = () => {
    //hooks区域
    const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
    const [staticDate,setStaticDate] = useState<CategoriesType[]>([])
    const [open, setOpen] = useState(false);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [isEdit,setEdit] = useState(0)
    const [form] = Form.useForm();
    const dispatch = useDispatch()
    const noteList = useSelector((state: any) => state.notes.Notes)
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
       initCategoryList()
    },[])

    async function initCategoryList(){
        const res = await getCategories()
        if(res.status===200){
            setStaticDate(res.data.data.map((item: { categoryKey: number; categoryTitle: string; color: string; icon: string; introduce: string; noteCount: number; pathName:string}) => {
                const matchedNotes = noteList.filter((note: { noteCategory: string; }) => note.noteCategory === item.categoryTitle);
                return {
                    key: item.categoryKey,
                    categoryTitle: item.categoryTitle,
                    pathName: item.pathName,
                    color: item.color,
                    icon: item.icon,
                    introduce: item.introduce,
                    noteCount: matchedNotes.length
                }
            }))
        }
    }

    //回调函数区域
    //删除逻辑
    const Delete = async (key:number) => {
        const res = await delCategory(key)
        if(res.status === 200){
            await initCategoryList()
            dispatch<any>(fetchCategories())
            message.success('删除成功')
        }
    }

    const DeleteAll = async () => {
        if (selectedRowKeys.length === 0) {
            message.warning('待选中')
        } else {
            const res = await delAllCategory(selectedRowKeys)
            try {
                if (res.status === 200) {
                    await initCategoryList()
                    dispatch<any>(fetchCategories())
                    message.success('删除成功')
                }
            } catch (error) {
                console.log(error)
            }
            setSelectedRowKeys([])
        }
    }

    //编辑逻辑
    const Change_Categories = (value:CategoriesType) => {
        setEdit(value.key)
        showModal()
        form.setFieldsValue({
            categorie: value.categoryTitle,
            introduce: value.introduce,
            categorie_icon: value.icon,
            categorie_color: value.color,
            pathName: value.pathName
        });
    }

    //表单提交
    const onfinish = async () => {
        // 获取整个表单的值
        const {categorie,introduce,categorie_icon,categorie_color} = form.getFieldsValue();
        const data:{ color: string; introduce: string;categoryTitle: string; icon: string,pathName:string } = {
            categoryTitle: categorie,
            icon:categorie_icon,
            color:form.getFieldsValue().categorie?'#000000':categorie_color.toHexString(),
            introduce:introduce,
            pathName: form.getFieldsValue().pathName
        }
        try {
            const res = await addCategory(data)
            if(res.status === 200){
                await initCategoryList()
                dispatch<any>(fetchCategories())
                message.success('添加成功')
            }
        }catch (error){
            console.log(error)
        }
    }

    const handleOk = async () => {
        if (isEdit !== 0) {
            const update = {
                categoryTitle: form.getFieldsValue().categorie,
                introduce: form.getFieldsValue().introduce,
                icon: form.getFieldsValue().categorie_icon,
                color: form.getFieldsValue().categorie_color.toHexString(),
                pathName: form.getFieldsValue().pathName
            }
            try {
                const res = await updateCategory(update, isEdit)
                if (res.status === 200) {
                    await initCategoryList()
                    message.success('更新成功')
                }
            } catch (error) {
                console.log(error)
            }
            setEdit(0);
            form.resetFields();
            setOpen(false);
        } else {
            form.validateFields().then(() => {
                setConfirmLoading(true);
                onfinish();
                setConfirmLoading(false);
                form.resetFields();
                setOpen(false);
            });
        }
    };

    const handleCancel = () => {
        form.resetFields()
        setEdit(0)
        setOpen(false);
    };

    //表单选中
    const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
        setSelectedRowKeys(newSelectedRowKeys);
    };
    const rowSelection = {
        selectedRowKeys,
        onChange: onSelectChange,
    };
    const hasSelected = selectedRowKeys.length > 0;
    //添加框打开
    const showModal = () => {
        setOpen(true);
    };

    //Tab数据
    const columns: TableProps<CategoriesType>['columns'] = [
        {
          title: '序列',
            render: (_text, _record, index) => index + 1,
          key: 'key',
          align: "center",
        },
        {
            title: '分类名称',
            dataIndex: 'categoryTitle',
            key: 'key',
            align: "center",
        },
        {
            title: '分类介绍',
            dataIndex: 'introduce',
            key: 'key',
            align: "center"
        },
        {
            title: '分类图标',
            dataIndex: 'icon',
            key: 'key',
            align: "center",
            render: (icon) => <i className={`fa ${icon}`} aria-hidden="true"></i>
        },
        {
            title: '文章数量',
            key: 'key',
            dataIndex: 'noteCount',
            align: "center",
        },
        {
            title: '颜色',
            key: 'key',
            dataIndex: 'color',
            align: "center",
            render: (color) => <Tag color={color}>{color}</Tag>
        },
        {
            title: '操作',
            key: 'key',
            align: "center",
            render: (item) => (
                <Space size="middle">
                    <Fab color="info" aria-label="edit" size='small' onClick={() => Change_Categories(item)}>
                        <EditIcon />
                    </Fab>
                    <Popconfirm
                        title="删除确认"
                        description="确定删除此分类？"
                        icon={<QuestionCircleOutlined style={{ color: 'red' }} />}
                        okText='删除'
                        onConfirm={() => Delete(item.key)}
                        cancelText='取消'
                    >
                        <Fab color="error" aria-label="delete" size='small'>
                            <DeleteIcon />
                        </Fab>
                    </Popconfirm>

                </Space>
            ),
        },
    ];

    //列表样式
    const listStyle: React.CSSProperties = {
        lineHeight: '200px',
        textAlign: 'center',
        background: 'white',
        borderRadius: '10px',
        marginTop: 10,
        maxWidth: '98%',
        height: '90%',
        marginLeft: '1%',
        overflowY: 'hidden'
    };
    const formItemLayout = {
        labelCol: {
            xs: { span: 24 },
            sm: { span: 6 },
        },
        wrapperCol: {
            xs: { span: 24 },
            sm: { span: 14 },
        },
    };

    const showdelModal = () => {
        setIsModalOpen(true);
    };

    const handledelOk = () => {
        DeleteAll()
        setIsModalOpen(false);
    };

    const handledelCancel = () => {
        setIsModalOpen(false);
    };
    return <>
        <div style={listStyle} className="searchRes">
            <Table columns={columns} dataSource={staticDate} pagination={{pageSize: 8}}
                   title={() => <>
                           <div style={{float: 'left',display:'flex'}} >
                               <Fab color="primary" aria-label="add" size='small' onClick={showModal}>
                                   <AddIcon />
                               </Fab>
                               <div style={{position:'absolute',width:220}}>
                                   {hasSelected&&<Fab variant="extended" color='error' size='medium' style={{ marginLeft: 10}} onClick={showdelModal}>
                                       <DeleteForeverIcon sx={{ mr: 1 }} className='allin'/>
                                       批量删除
                                   </Fab>}
                               </div>
                           </div>
                       <h2 style={{marginRight: 150}}>
                           <FolderOpenOutlined /> 分类管理
                       </h2>
                   </>}
                   rowSelection={rowSelection}
                   scroll={{y:480,x:1000}}
            />
        </div>

        <Modal
            title="分类新增"
            open={open}
            onOk={handleOk}
            confirmLoading={confirmLoading}
            onCancel={handleCancel}
            okText={isEdit=== 0? '添加' : '保存'}
            cancelText='取消'
        >
            <Form {...formItemLayout} variant="filled" style={{ maxWidth: 600 }} form={form} onFinish={onfinish}>
                <Form.Item label="分类名称" name="categorie" >
                    <Input/>
                </Form.Item>

                <Form.Item label="路径名称" name="pathName" >
                    <Input/>
                </Form.Item>

                <Form.Item
                    label="分类介绍"
                    name="introduce"
                    rules={[{ required: true, message: 'Please input!' }]}
                >
                    <Input.TextArea autoSize={{ minRows: 4, maxRows: 8 }}/>
                </Form.Item>


                <Form.Item label="分类图标" name="categorie_icon"
                           rules={[{ required: true, message: 'Please input!' }]}
                >
                    <Input/>
                </Form.Item>

                <Form.Item label="颜色" name="categorie_color" >
                    <ColorPicker defaultValue="black" showText  disabledAlpha/>
                </Form.Item>
            </Form>
        </Modal>

        <Modal title="删除确认" open={isModalOpen} onOk={handledelOk} onCancel={handledelCancel} okText="确定" cancelText="取消">
            是否删除选中所有分类?
        </Modal>
    </>
}
export default  AllCategorize
