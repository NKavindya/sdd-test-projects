import { useState } from 'react';
import {
  Button,
  Drawer,
  Empty,
  Form,
  Input,
  List,
  Pagination,
  Popconfirm,
  Rate,
  Space,
  Typography,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../../../../services/StoreContext';
import { useResource } from '../../../../../services/useResource';
import { scopes } from '../../../../../common/contracts';
import {
  ErrorState,
  Loading,
  Warning,
  useFeedback,
} from '../../../../../components/States';

export default function Reviews({ uuid, installable }) {
  const { api, can, user } = useStore();
  const { t } = useTranslation();
  const feedback = useFeedback();
  const [editor, setEditor] = useState(null);
  const [all, setAll] = useState(false);
  const [page, setPage] = useState(1);
  const [busy, setBusy] = useState(false);
  const [form] = Form.useForm();
  const personal = useResource(
    (signal) => api.reviews(uuid, true, 0, 20, signal),
    [uuid],
    can(scopes.reviewView),
  );
  const community = useResource(
    (signal) => api.reviews(uuid, false, (page - 1) * 20, 20, signal),
    [uuid, page],
    can(scopes.reviewView),
  );
  const rating = useResource(
    (signal) => api.rating(uuid, signal),
    [uuid],
    can(scopes.reviewView),
  );
  const reload = () => {
    personal.reload();
    community.reload();
    rating.reload();
  };
  const edit = (review = {}) => {
    setEditor(review);
    form.setFieldsValue({ rating: review.rating, content: review.content });
  };
  const save = async (values) => {
    setBusy(true);
    try {
      await api.saveReview(uuid, editor.id, values);
      setEditor(null);
      form.resetFields();
      reload();
    } catch (error) {
      feedback.error(error, 'We are unable to add your review right now.');
    } finally {
      setBusy(false);
    }
  };
  const remove = async (review) => {
    try {
      await api.deleteReview(
        uuid,
        review.id,
        review.username !== user.username,
      );
      reload();
    } catch (error) {
      feedback.error(error);
    }
  };
  if (!can(scopes.reviewView)) return null;
  if (personal.loading || community.loading) return <Loading />;
  if (personal.error || community.error)
    return <ErrorState error={personal.error || community.error} />;
  const own = personal.data?.data?.[0];
  const renderReview = (review) => (
    <List.Item
      actions={[
        ...(review.username === user.username &&
        can(scopes.reviewUpdate) &&
        installable
          ? [
              <Button key="edit" type="link" onClick={() => edit(review)}>
                {t('Edit')}
              </Button>,
            ]
          : []),
        ...((review.username === user.username &&
          can(scopes.reviewUpdate) &&
          installable) ||
        (review.username !== user.username && can(scopes.reviewAdmin))
          ? [
              <Popconfirm
                key="delete"
                title={t('Delete')}
                okText={t('Done')}
                cancelText={t('Cancel')}
                onConfirm={() => remove(review)}
              >
                <Button type="link">{t('Delete')}</Button>
              </Popconfirm>,
            ]
          : []),
      ]}
    >
      <List.Item.Meta
        title={
          <Space>
            {review.username}
            <Rate disabled value={review.rating} />
          </Space>
        }
        description={
          <>
            <Typography.Paragraph>{review.content}</Typography.Paragraph>
            {review.replies?.length > 0 && (
              <List dataSource={review.replies} renderItem={renderReview} />
            )}
          </>
        }
      />
    </List.Item>
  );
  return (
    <section className="overview-section">
      <h3>{t('MY REVIEW')}</h3>
      {!can(scopes.reviewUpdate) && (
        <Warning>{"You don't have permission to add a review."}</Warning>
      )}
      {own ? (
        <List dataSource={[own]} renderItem={renderReview} />
      ) : (
        <Empty
          description={t(
            'Share your experience with your community by adding a review.',
          )}
        />
      )}
      {!own && can(scopes.reviewUpdate) && (
        <Button type="primary" disabled={!installable} onClick={() => edit()}>
          {t('Write a Review')}
        </Button>
      )}
      {rating.data?.noOfUsers > 0 && (
        <Space className="spaced">
          <Rate disabled allowHalf value={rating.data.ratingValue} />
          <span>{rating.data.noOfUsers}</span>
        </Space>
      )}
      <List
        dataSource={community.data?.data?.slice(0, 3) || []}
        renderItem={renderReview}
      />
      {(community.data?.recordsTotal || 0) > 3 && (
        <Button type="link" onClick={() => setAll(true)}>
          {t('Read all reviews')}
        </Button>
      )}
      <Drawer
        title={t('Read all reviews')}
        width={640}
        open={all}
        onClose={() => setAll(false)}
      >
        <List
          dataSource={community.data?.data || []}
          renderItem={renderReview}
        />
        <Pagination
          current={page}
          pageSize={20}
          total={community.data?.recordsTotal || 0}
          onChange={setPage}
          showSizeChanger={false}
        />
      </Drawer>
      <Drawer
        title={t('Write a Review')}
        width={520}
        open={editor !== null}
        destroyOnClose
        onClose={() => {
          setEditor(null);
          form.resetFields();
        }}
      >
        <Form form={form} layout="vertical" onFinish={save}>
          <Form.Item name="rating">
            <Rate />
          </Form.Item>
          <Form.Item name="content">
            <Input.TextArea rows={6} />
          </Form.Item>
          <Space>
            <Button
              onClick={() => {
                setEditor(null);
                form.resetFields();
              }}
            >
              {t('Cancel')}
            </Button>
            <Button type="primary" htmlType="submit" loading={busy}>
              {t('Save')}
            </Button>
          </Space>
        </Form>
      </Drawer>
    </section>
  );
}
