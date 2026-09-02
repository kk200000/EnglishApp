export type ChatRole = 'human' | 'ai'; //角色 human: 用户 ai: 助手 langchain框架的枚举
export type ChatRoleType = 'normal' | 'master' | 'business' | 'qilinge' | 'xiaoman'; //角色类型
//消息列表的对象类型
export type ChatMessage = {
    role:ChatRole //角色 human: 用户 ai: 助手
    content:string; //内容
}
//消息列表
export type ChatMessageList = ChatMessage[]

//定义左侧消息模式的对象
export type ChatMode = {
    label:string; //标签
    id:string; //id
    role:ChatRoleType; //角色
}
//左侧消息模式列表
export type ChatModeList = ChatMode[]


//定义发送消息的类型
export type ChatDto = {
    role:ChatRoleType; //角色
    content:string; //内容
    userId:string; //用户id
}

//会话隔离 线程id userId-role  userId:123 role:normal 线程id:123-normal
//查询历史记录 线程id查询 123-normal 查询出123-normal的记录