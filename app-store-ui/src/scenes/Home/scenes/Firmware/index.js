import { useState } from 'react';
import {
  Breadcrumb,
  Button,
  Collapse,
  Descriptions,
  Form,
  Input,
  Modal,
  Select,
  Space,
  Table,
  Tag,
} from 'antd';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../../../services/StoreContext';
import { useResource } from '../../../../services/useResource';
import { imageUrl, scopes } from '../../../../common/contracts';
import { ErrorState, Permission } from '../../../../components/States';
import OperationForm from '../Install/components/OperationForm';
import Subscriptions from '../Release/components/Subscriptions';

export default function Firmware() {
  const { id, deviceType } = useParams();
  const location = useLocation();
  const { api, can } = useStore();
  const { t } = useTranslation();
  const firmware = location.state?.firmware;
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState({});
  const [modal, setModal] = useState(null);
  const resource = useResource(
    (signal) =>
      api.releases(
        id,
        'CUSTOM',
        { ...filters, limit: 10, offset: (page - 1) * 10 },
        signal,
      ),
    [id, filters, page],
    can(scopes.view),
  );
  if (!can(scopes.view)) return <Permission />;
  if (resource.error)
    return (
      <ErrorState
        error={resource.error}
        description="Error occurred while trying to load firmware release."
      />
    );
  const close = () => setModal(null);
  return (
    <>
      <Breadcrumb
        className="spaced"
        items={[
          { title: <Link to="/store/">{t('Home')}</Link> },
          { title: <Link to="/store/">{t('Apps')}</Link> },
          { title: deviceType },
          {
            title: (
              <Link
                to={`/store/${deviceType}/applications`}
                state={{ selected: 'firmware' }}
              >
                {t('Firmware')}
              </Link>
            ),
          },
          { title: firmware?.name },
        ]}
      />
      {firmware?.firmwareModels?.length > 0 && (
        <Descriptions
          className="firmware-summary"
          items={[
            { key: 'name', label: t('Firmware Name'), children: firmware.name },
            {
              key: 'description',
              label: t('Description'),
              children: firmware.description,
            },
            {
              key: 'models',
              label: t('Associated Models'),
              children: firmware.firmwareModels.map((model) => (
                <Tag key={model}>{model}</Tag>
              )),
            },
          ]}
        />
      )}
      <Collapse
        className="spaced"
        items={[
          {
            key: 'search',
            label: t('Search Firmware Releases'),
            children: (
              <Form
                layout="inline"
                onFinish={(values) => {
                  setFilters(values);
                  setPage(1);
                }}
              >
                <Form.Item
                  name="packageName"
                  label={t('Firmware Package Name')}
                >
                  <Input />
                </Form.Item>
                <Form.Item name="version" label={t('Version')}>
                  <Input />
                </Form.Item>
                <Form.Item name="releaseType" label={t('Release Channels')}>
                  <Select
                    allowClear
                    options={['PRODUCTION', 'TEST'].map((value) => ({
                      value,
                      label: value,
                    }))}
                  />
                </Form.Item>
                <Button type="primary" htmlType="submit">
                  {t('Apply')}
                </Button>
              </Form>
            ),
          },
        ]}
      />
      <Table
        rowKey="uuid"
        loading={resource.loading}
        dataSource={resource.data?.releases || []}
        columns={[
          { title: t('Firmware Package Name'), dataIndex: 'packageName' },
          { title: t('Version'), dataIndex: 'version' },
          { title: t('Release Channels'), dataIndex: 'releaseType' },
          {
            title: t('Actions'),
            render: (_, release) => (
              <Space>
                <Button
                  type="link"
                  title={t('Install this firmware')}
                  onClick={() => setModal({ type: 'install', release })}
                >
                  {t('Install')}
                </Button>
                <Button
                  type="link"
                  title={t('View subscription details')}
                  onClick={() => setModal({ type: 'subscriptions', release })}
                >
                  {t('Subscription Details')}
                </Button>
              </Space>
            ),
          },
        ]}
        expandable={{
          expandedRowRender: (release) => (
            <Descriptions
              items={[
                {
                  key: 'version',
                  label: t('Version'),
                  children: release.version,
                },
                {
                  key: 'channel',
                  label: t('Firmware channel'),
                  children: release.releaseType,
                },
                {
                  key: 'status',
                  label: t('Status'),
                  children: (
                    <Tag
                      color={
                        release.currentStatus === 'RELEASED'
                          ? '#3f8600'
                          : undefined
                      }
                    >
                      {release.currentStatus}
                    </Tag>
                  ),
                },
                {
                  key: 'os',
                  label: t('Supported OS'),
                  children: release.supportedOsVersions,
                },
                {
                  key: 'description',
                  label: t('Description'),
                  children: release.description,
                },
              ]}
            />
          ),
        }}
        pagination={{
          current: page,
          pageSize: 10,
          total: resource.data?.pagination.count || 0,
          onChange: setPage,
          showSizeChanger: false,
        }}
      />
      <Modal
        open={modal !== null}
        title={modal?.release.packageName}
        width={modal?.type === 'install' ? 1200 : 1400}
        onCancel={close}
        onOk={close}
        okText={t('Done')}
        cancelText={t('Cancel')}
        destroyOnClose
      >
        {modal && (
          <>
            <div className="firmware-modal-identity">
              {modal.release.iconPath && (
                <img src={imageUrl(modal.release.iconPath)} alt="" />
              )}
              <Space>
                <Tag>{modal.release.version}</Tag>
                <Tag>{modal.release.releaseType}</Tag>
              </Space>
            </div>
            {modal.type === 'install' ? (
              <OperationForm
                key={modal.release.uuid}
                app={{ ...firmware, type: 'CUSTOM', deviceType: 'android' }}
                release={modal.release}
                firmware
              />
            ) : (
              <Subscriptions
                key={modal.release.uuid}
                uuid={modal.release.uuid}
                firmware
              />
            )}
          </>
        )}
      </Modal>
    </>
  );
}
