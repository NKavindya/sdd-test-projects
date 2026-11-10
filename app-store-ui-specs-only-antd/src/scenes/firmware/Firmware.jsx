import FirmwareDetails from './FirmwareDetails';
import { useCallback, useEffect, useState } from 'react';
import { Button, Card, Descriptions, Modal, Tag } from 'antd';
import { useHistory, useLocation, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../services/context';
import { store, showError } from '../../services/api';
import { scopes } from '../../services/contracts';
import { FilterPanel as EntgraSearchFilter } from '../../shared/EntgraSearchFilter';
import EntgraTable from '../../shared/EntgraTable';
import Breadcrumbs from '../../shared/Breadcrumbs';
import { Permission } from '../../shared/Feedback';
import Subscriptions from '../release/Subscriptions';
import FirmwareInstall from './FirmwareInstall';
export default function Firmware() {
  const { t } = useTranslation();
  const { deviceType, id } = useParams();
  const { has } = useStore();
  const history = useHistory();
  const location = useLocation();
  const firmware = location.state?.firmware;
  const [groupSubview, setGroupSubview] = useState(false);
  const [rows, setRows] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filter, setFilter] = useState({});
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null);
  const load = useCallback(async () => {
    if (!has(scopes.view)) return;
    setLoading(true);
    try {
      const result = await store(
        'POST',
        `/applications/${id}/releases/CUSTOM`,
        {
          ...filter,
          applicationId: Number(id),
          limit: pageSize,
          offset: (page - 1) * pageSize,
        },
      );
      setRows(result.releases);
      setTotal(result.pagination.count);
    } catch (error) {
      showError(error, 'Error occurred while trying to load firmware release.');
    } finally {
      setLoading(false);
    }
  }, [id, page, pageSize, JSON.stringify(filter)]);
  useEffect(() => {
    load();
  }, [load]);
  async function openSubscriptions(release) {
    if (!has(scopes.subView)) {
      setModal({ type: 'subscriptions', release, counts: [] });
      return;
    }
    try {
      const counts = await store(
        'GET',
        `/admin/subscription/${release.uuid}/subscriptions/count`,
      );
      setModal({
        type: 'subscriptions',
        release,
        counts: counts.filter(
          (item) =>
            !['user', 'role'].includes(item.subscriptionType.toLowerCase()),
        ),
      });
    } catch (error) {
      showError(
        error,
        'Error occurred while trying to load subscription types.',
      );
    }
  }
  if (!has(scopes.view)) return <Permission />;
  return (
    <>
      <Breadcrumbs
        items={[
          'Apps',
          {
            android: 'Android',
            ios: 'iOS',
            windows: 'Windows',
            'web-clip': 'Web Apps',
          }[deviceType],
          {
            title: (
              <Button
                type="link"
                onClick={() =>
                  history.push(`/${deviceType}/applications`, {
                    selected: 'firmware',
                  })
                }
              >
                {t('Firmware')}
              </Button>
            ),
          },
          firmware?.name || '',
        ]}
      />
      {!!firmware?.firmwareModels?.length && (
        <Card className="firmware-summary">
          <Descriptions
            column={{ xs: 1, md: 3 }}
            items={[
              {
                key: 'name',
                label: t('Firmware Name'),
                children: firmware.name,
              },
              {
                key: 'description',
                label: t('Description'),
                children: firmware.description,
              },
              {
                key: 'models',
                label: t('Associated Models'),
                children: firmware.firmwareModels.map((m) => (
                  <Tag key={m}>{m}</Tag>
                )),
              },
            ]}
          />
        </Card>
      )}
      <Card>
        <EntgraSearchFilter
          title="Search Firmware Releases"
          variant="common"
          contextId={id}
          criteria={[
            {
              key: 'packageName',
              label: 'Firmware Package Name',
              type: 'text',
            },
            { key: 'version', label: 'Version', type: 'text' },
            {
              key: 'releaseType',
              label: 'Release Channels',
              type: 'choice',
              options: ['PRODUCTION', 'TEST'],
            },
          ]}
          onResult={(next) => {
            setFilter(next);
            setPage(1);
          }}
        />
        <EntgraTable
          loading={loading}
          columns={[
            { title: t('Firmware Package Name'), dataIndex: 'packageName' },
            { title: t('Version'), dataIndex: 'version' },
            { title: t('Release Channels'), dataIndex: 'releaseType' },
          ]}
          records={rows}
          rowKey="uuid"
          hasAccess={(permissions) => permissions.every(has)}
          actions={[
            {
              label: t('Install'),
              tooltip: t('Install this firmware'),
              permissions: [scopes.view],
              run: (release) => setModal({ type: 'install', release }),
            },
            {
              label: t('Subscription Details'),
              tooltip: t('View subscription details'),
              permissions: [scopes.view],
              run: openSubscriptions,
            },
          ]}
          expandable={{
            expandedRowRender: (r) => (
              <Descriptions
                items={[
                  { key: 'version', label: t('Version'), children: r.version },
                  {
                    key: 'channel',
                    label: t('Firmware channel'),
                    children: r.releaseType,
                  },
                  {
                    key: 'status',
                    label: t('Status'),
                    children: (
                      <Tag
                        color={
                          r.currentStatus === 'RELEASED' ? 'green' : undefined
                        }
                      >
                        {r.currentStatus}
                      </Tag>
                    ),
                  },
                  { key: 'name', label: t('Name'), children: r.packageName },
                  {
                    key: 'os',
                    label: t('Supported OS'),
                    children: r.supportedOsVersions,
                  },
                  {
                    key: 'description',
                    label: t('Description'),
                    children: r.description,
                  },
                ]}
              />
            ),
          }}
          pagination={{
            current: page,
            pageSize,
            total,
            onChange: (p, size) => {
              setPage(p);
              setPageSize(size);
            },
          }}
        />
      </Card>
      {modal && (
        <Modal
          open
          destroyOnClose
          title={modal.release.packageName}
          width={modal.type === 'install' ? 1200 : 1400}
          footer={groupSubview ? null : undefined}
          onCancel={() => {
            setModal(null);
            setGroupSubview(false);
          }}
          onOk={() => {
            setModal(null);
            setGroupSubview(false);
          }}
        >
          {modal.type === 'install' ? (
            <FirmwareInstall
              release={modal.release}
              onSubviewChange={setGroupSubview}
              onSuccess={() => {
                setModal(null);
                setGroupSubview(false);
              }}
            />
          ) : (
            <>
              <FirmwareDetails release={modal.release} />
              <Subscriptions
                firmware
                uuid={modal.release.uuid}
                initialCounts={modal.counts}
              />
            </>
          )}
        </Modal>
      )}
    </>
  );
}
