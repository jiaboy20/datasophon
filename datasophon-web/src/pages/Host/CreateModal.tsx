import { ProFormText, ProFormTextArea, ProTable, StepsForm } from "@ant-design/pro-components";
import { Alert, Button, Modal, ModalProps, message } from "antd";
import { useTranslation } from "react-i18next";
import { APIS } from "../../services/cluster";
import { useParams } from "react-router-dom";
import { useState } from "react";
import CreateCheckList from "./CreateCheckList";
import CreateAgentList from "./CreateAgentList";
interface ModalType extends ModalProps {
    data?: any;
}


type CheckResultType = {
  code: number;
  msg: string;
}
type AnalysisType = {
  hostname: string;
  managed: boolean;
  checkResult: CheckResultType;
}

const CreateModal = (props: ModalType) => {
    const { t } = useTranslation()
    const { clusterId } = useParams()
    const [analysisList, setAnalysisList] = useState<Array<AnalysisType>>([])
    const [agentList, setAgentList] = useState<Array<any>>([])
    let timer: number | undefined = undefined
    const analysisHostList = async (values: any) => {
      const { code, data, msg } = await APIS.ClusterApi.analysisHostList({
        page: 1,
        pageSize: 10,
        clusterId,
        ...values
      })
      if (code === 200) {
        // 返回主机列表之后需要轮询来查询主机状态
        setAnalysisList(data)
        if (!timer) {
          timer = setInterval(()=> {
            analysisHostList(values)
          }, 3000)
        }
        return true
      } else {
        // TODO: 异常处理比较粗暴，待优化
        message.error(msg)
        return false
      }
    }

    const dispatcherHostAgentList = async () => {
      const { code, data, msg } = await APIS.ClusterApi.dispatcherHostAgentList({
        page: 1,
        pageSize: 10,
        clusterId,
      })
      if (code === 200) {
        // 返回主机列表之后需要轮询来查询主机状态
        setAgentList(data)
        if (!timer) {
          timer = setInterval(()=> {
            dispatcherHostAgentList()
          }, 3000)
        }
        return true
      } else {
        // TODO: 异常处理比较粗暴，待优化
        message.error(msg)
        return false
      }
    }

    const dispatcherHostAgentCompleted = async () => {
      let finish = false
      const { code, dispatcherHostAgentCompleted, msg } = await APIS.ClusterApi.dispatcherHostAgentCompleted({ clusterId })
      if (code === 200) {
        // TODO: 刷新主机列表
        finish = dispatcherHostAgentCompleted
      } else {
        message.error(msg)
        finish = dispatcherHostAgentCompleted;
      }
      return finish
    }

    return (
      <StepsForm
        onFinish={async () => {
            return dispatcherHostAgentCompleted()
        }}
        stepsFormRender={(dom, submitter) => {
          return (
            <Modal
              width={1000}
              footer={submitter}
              destroyOnClose
              {...props}
            >
              {dom}
            </Modal>
          );
        }}
        containerStyle={{ width: '100%'}}
      >
        <StepsForm.StepForm
            name="install"
            title="安装主机"
            onFinish={async (values: any) => {
              return analysisHostList(values)
          }}
        >
          <Alert message="提示：使用IP或主机名输入主机列表，按逗号分隔或使用主机域批量添加主机，例如：10.3.144.[19-23]" type="info"></Alert>
          <ProFormTextArea 
            name="hosts"
            label="主机列表"
            rules={[{ required: true }]}
          />
          <ProFormText
            name="sshUser"
            label="SSH用户名"
            initialValue="root"
            rules={[{ required: true }]}
          />
          <ProFormText
            name="sshPort"
            label="SSH端口"
            initialValue={22}
            rules={[{ required: true }]}
          />
        </StepsForm.StepForm>
        <StepsForm.StepForm
            name="check"
            title="主机环境校验"
            onFinish={() => {
              clearInterval(timer)
              return dispatcherHostAgentList();
          }}
        >
          <CreateCheckList  data={analysisList}/>
        </StepsForm.StepForm>
        <StepsForm.StepForm
            name="distribute"
            title="主机Agent分发"
        >
          <CreateAgentList  data={agentList}/>
        </StepsForm.StepForm>
      </StepsForm>
    )
}

export default CreateModal