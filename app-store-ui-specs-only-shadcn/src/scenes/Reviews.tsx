import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Modal } from '@/components/ui/dialog';
import { Stars, Confirm } from '@/shared/common';
import { api, notifyError } from '@/services/client';
import { useSession } from '@/services/session';
import { scopes, type Review } from '@/services/types';
export function Reviews({
  uuid,
  installable,
}: {
  uuid: string;
  installable: boolean;
}) {
  const { t } = useTranslation();
  const session = useSession();
  const [mine, setMine] = useState<Review[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(3);
  const [edit, setEdit] = useState<Review | null | undefined>();
  const [reply, setReply] = useState<number>();
  const [rating, setRating] = useState(0);
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [remove, setRemove] = useState<Review>();
  const [summary, setSummary] = useState<{
    ratingValue: number;
    noOfUsers: number;
    ratingVariety: Record<string, number>;
  }>();
  const load = async () => {
    try {
      const [own, community, aggregate] = await Promise.all([
        api<{ data: Review[] }>(
          'store',
          'GET',
          `/reviews/app/user/${uuid}`,
          undefined,
          { offSet: 0, limit: 20 },
        ),
        api<{ data: Review[]; recordsTotal: number }>(
          'store',
          'GET',
          `/reviews/app/${uuid}`,
          undefined,
          { offSet: 0, limit },
        ),
        api<{
          ratingValue: number;
          noOfUsers: number;
          ratingVariety: Record<string, number>;
        }>('store', 'GET', `/reviews/${uuid}/app-rating`),
      ]);
      setMine(own.data || []);
      setReviews(community.data || []);
      setTotal(community.recordsTotal);
      setSummary(aggregate);
    } catch (e) {
      notifyError(e);
    }
  };
  useEffect(() => {
    if (session.has(scopes.reviewView)) load();
  }, [uuid, limit]);
  if (!session.has(scopes.reviewView)) return null;
  const canWrite = session.has(scopes.reviewUpdate);
  const open = (review: Review | null, parent?: number) => {
    setReply(parent);
    setEdit(review);
    setRating(review?.rating || 0);
    setContent(review?.content || '');
  };
  return (
    <section className="review-section">
      {!canWrite && (
        <div className="alert">
          {t("You don't have permission to add a review.")}
        </div>
      )}
      <h2>{t('My Review')}</h2>
      {mine.map((review) => (
        <div key={review.id}>
          <Stars value={review.rating} />
          <p>{review.content}</p>
          {canWrite && (
            <div className="flex gap-2">
              <Button variant="link" onClick={() => open(review)}>
                {t('Edit')}
              </Button>
              <Button variant="link" onClick={() => setRemove(review)}>
                {t('Delete')}
              </Button>
            </div>
          )}
        </div>
      ))}
      {!mine.length && <Stars />}
      <Button
        className="mt-4"
        variant="outline"
        disabled={!canWrite || !installable}
        title={
          !installable
            ? "Can't perform the action. This release isn't in an installable state."
            : undefined
        }
        onClick={() => open(null)}
      >
        {t('Write a Review')}
      </Button>
      {summary && summary.noOfUsers > 0 && (
        <div className="rating-summary">
          <strong>{summary.ratingValue.toFixed(1)}</strong>
          <Stars value={summary.ratingValue} />
          <div>
            {[5, 4, 3, 2, 1].map((n) => (
              <div className="rating-line" key={n}>
                <span>{n}</span>
                <progress
                  max={summary.noOfUsers}
                  value={summary.ratingVariety?.[n] || 0}
                />
              </div>
            ))}
          </div>
        </div>
      )}
      {reviews.map((review) => (
        <article className="community-review" key={review.id}>
          <strong>{review.username}</strong>
          <Stars value={review.rating} />
          <p>{review.content}</p>
          {canWrite && (
            <Button variant="link" onClick={() => open(null, review.id)}>
              {t('Reply')}
            </Button>
          )}
          {session.has(scopes.reviewAdmin) &&
            review.username !== session.username && (
              <Button
                variant="ghost"
                aria-label="Delete review"
                onClick={() => setRemove(review)}
              >
                <Trash2 size={15} />
              </Button>
            )}
          {review.replies?.map((r) => (
            <blockquote key={r.id}>
              <b>{r.username}</b>
              <p>{r.content}</p>
            </blockquote>
          ))}
        </article>
      ))}
      {total > reviews.length && (
        <Button variant="link" onClick={() => setLimit(limit + 20)}>
          {t('Read all reviews')}
        </Button>
      )}
      <Modal
        open={edit !== undefined}
        onOpenChange={() => {
          setEdit(undefined);
          setContent('');
        }}
        title={t('Write a Review')}
      >
        <Stars value={rating} onChange={setRating} />
        <textarea
          aria-label="Review"
          className="textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setEdit(undefined)}>
            {t('Cancel')}
          </Button>
          <Button
            disabled={!rating || !content.trim() || saving}
            onClick={async () => {
              setSaving(true);
              try {
                await api(
                  'store',
                  edit ? 'PUT' : 'POST',
                  `/reviews/${uuid}${edit ? '/' + edit.id : reply ? '/' + reply : ''}`,
                  { rating, content },
                );
                setEdit(undefined);
                await load();
              } catch (e) {
                notifyError(e, 'We are unable to add your review right now.');
              } finally {
                setSaving(false);
              }
            }}
          >
            {t('Save')}
          </Button>
        </div>
      </Modal>
      {remove && (
        <Confirm
          message="Are you sure?"
          onClose={() => setRemove(undefined)}
          onConfirm={async () => {
            try {
              const own = remove.username === session.username;
              await api(
                'store',
                'DELETE',
                `/${own ? 'reviews' : 'admin/reviews'}/${uuid}/${remove.id}`,
              );
              await load();
            } catch (e) {
              notifyError(e);
            }
          }}
        />
      )}
    </section>
  );
}
