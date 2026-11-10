import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Drawer,
  Form,
  Input,
  List,
  Popconfirm,
  Progress,
  Space,
  Typography,
} from 'antd';
import { useTranslation } from 'react-i18next';
import { useStore } from '../../services/context';
import { store, showError } from '../../services/api';
import { scopes, cannotPerform, toLocalTime } from '../../services/contracts';
import Stars from '../../shared/Stars';
export default function Reviews({ uuid, installable }) {
  const { t } = useTranslation();
  const { user, has } = useStore();
  const [rows, setRows] = useState([]);
  const [mine, setMine] = useState([]);
  const [rating, setRating] = useState(null);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(3);
  const [draft, setDraft] = useState(null);
  const [busy, setBusy] = useState(false);
  const [form] = Form.useForm();
  const load = useCallback(async () => {
    if (!has(scopes.reviewView)) return;
    const results = await Promise.allSettled([
      store('GET', `/reviews/app/${uuid}`, undefined, { offSet: 0, limit }),
      store('GET', `/reviews/app/user/${uuid}`, undefined, {
        offSet: 0,
        limit: 20,
      }),
      store('GET', `/reviews/${uuid}/app-rating`),
    ]);
    results.forEach((result) => {
      if (result.status === 'rejected') showError(result.reason);
    });
    if (results[0].status === 'fulfilled') {
      setRows(results[0].value.data || []);
      setTotal(results[0].value.recordsTotal || 0);
    }
    if (results[1].status === 'fulfilled') setMine(results[1].value.data || []);
    if (results[2].status === 'fulfilled') setRating(results[2].value);
  }, [uuid, limit]);
  useEffect(() => {
    load();
  }, [load]);
  if (!has(scopes.reviewView)) return null;
  const update = has(scopes.reviewUpdate);
  function edit(review = {}, replyTo) {
    setDraft({ review, replyTo });
    form.setFieldsValue({
      content: review.content || '',
      rating: review.rating || 0,
    });
  }
  async function save(values) {
    setBusy(true);
    try {
      const { review, replyTo } = draft;
      await store(
        review.id ? 'PUT' : 'POST',
        `/reviews/${uuid}${review.id ? `/${review.id}` : replyTo ? `/${replyTo}` : ''}`,
        values,
      );
      setDraft(null);
      form.resetFields();
      await load();
    } catch (error) {
      showError(error, 'We are unable to add your review right now.');
    } finally {
      setBusy(false);
    }
  }
  async function remove(review) {
    try {
      const admin = review.username !== user.username;
      await store(
        'DELETE',
        `${admin ? '/admin' : ''}/reviews/${uuid}/${review.id}`,
      );
      await load();
    } catch (error) {
      showError(error);
    }
  }
  function reviewItem(review) {
    const own = review.username === user.username;
    return (
      <List.Item key={review.id}>
        <div className="review-item">
          <strong>{review.username}</strong>
          <Stars rating={review.rating} />
          <small>{toLocalTime(review.createdAt)}</small>
          <p className="review-content">{review.content}</p>
          <Space>
            {own && update && (
              <Button type="link" onClick={() => edit(review)}>
                {t('Edit')}
              </Button>
            )}
            {(own ? update : has(scopes.reviewAdmin)) && (
              <Popconfirm
                title={t('Are you sure?')}
                onConfirm={() => remove(review)}
              >
                <Button type="link" danger>
                  {t('Delete')}
                </Button>
              </Popconfirm>
            )}
            {update && installable && (
              <Button type="link" onClick={() => edit({}, review.id)}>
                {t('Reply')}
              </Button>
            )}
          </Space>
          {review.replies?.map((reply) => reviewItem(reply))}
        </div>
      </List.Item>
    );
  }
  return (
    <section className="reviews">
      <Typography.Title level={4}>{t('My Review')}</Typography.Title>
      {!update && (
        <Alert
          type="warning"
          message={t(
            'We are sorry, You do not have access to this page or resources for some reason.',
          )}
        />
      )}
      <Stars rating={mine[0]?.rating} />
      {mine.length > 0 && <List dataSource={mine} renderItem={reviewItem} />}
      <Button
        disabled={!update || !installable}
        title={!installable ? t(cannotPerform) : undefined}
        onClick={() => edit(mine[0] || {})}
      >
        {t('Write a Review')}
      </Button>
      {rating && rating.noOfUsers > 0 && (
        <div className="rating-summary">
          <strong>{rating.ratingValue} / 5</strong>
          {[5, 4, 3, 2, 1].map((star) => (
            <div key={star}>
              {star}{' '}
              <Progress
                percent={Math.round(
                  ((rating.ratingVariety?.[star] || 0) * 100) /
                    rating.noOfUsers,
                )}
                size="small"
              />
            </div>
          ))}
        </div>
      )}
      <List dataSource={rows} renderItem={reviewItem} />
      {total > rows.length && (
        <Button type="link" onClick={() => setLimit((n) => n + 20)}>
          {t('Read all reviews')}
        </Button>
      )}
      <Drawer
        title={t('Write a Review')}
        open={!!draft}
        onClose={() => {
          setDraft(null);
          form.resetFields();
        }}
        destroyOnClose
        width={480}
      >
        <Form form={form} onFinish={save} layout="vertical">
          <Form.Item
            name="rating"
            rules={[
              {
                validator: (_, value) =>
                  value > 0
                    ? Promise.resolve()
                    : Promise.reject(new Error(t('required'))),
              },
            ]}
          >
            <RatingInput />
          </Form.Item>
          <Form.Item
            name="content"
            rules={[{ required: true, message: t('required') }]}
          >
            <Input.TextArea rows={7} />
          </Form.Item>
          <Space>
            <Button type="primary" htmlType="submit" loading={busy}>
              {t('Save')}
            </Button>
            <Button
              onClick={() => {
                setDraft(null);
                form.resetFields();
              }}
            >
              {t('Cancel')}
            </Button>
          </Space>
        </Form>
      </Drawer>
    </section>
  );
}
function RatingInput({ value, onChange }) {
  return <Stars rating={value} onChange={onChange} size="28px" />;
}
