import { Button } from '../shared/Button';
import { useEffect, useState } from 'react';
import { TextArea } from '@heroui/react';
import { useTranslation } from 'react-i18next';
import { useSession } from '../services/session';
import { api } from '../services/client';
import {
  scope,
  type ListResult,
  type Rating,
  type Review,
} from '../services/model';
import { Stars, Dialog, problem } from '../shared/ui';
export default function Reviews({
  uuid,
  published,
}: {
  uuid: string;
  published: boolean;
}) {
  const { t } = useTranslation();
  const { has, username } = useSession();
  const [own, setOwn] = useState<Review>();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [count, setCount] = useState(0);
  const [rating, setRating] = useState<Rating>();
  const [editor, setEditor] = useState(false);
  const [content, setContent] = useState('');
  const [stars, setStars] = useState(0);
  const [busy, setBusy] = useState(false);
  const [reviewLimit, setReviewLimit] = useState(3);
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void Promise.all([
      api<ListResult<Review>>(`/reviews/app/user/${uuid}`, 'GET', undefined, {
        offSet: 0,
        limit: 20,
      }),
      api<ListResult<Review>>(`/reviews/app/${uuid}`, 'GET', undefined, {
        offSet: 0,
        limit: reviewLimit,
      }),
      api<Rating>(`/reviews/${uuid}/app-rating`),
    ])
      .then(([mine, list, r]) => {
        if (active) {
          setOwn(mine.data[0]);
          setReviews(list.data);
          setCount(list.recordsTotal || 0);
          setRating(r);
        }
      })
      .catch(problem);
    return () => {
      active = false;
    };
  }, [uuid, revision, reviewLimit]);
  function edit(review?: Review) {
    setContent(review?.content || '');
    setStars(review?.rating || 0);
    setEditor(true);
  }
  async function remove(r: Review) {
    try {
      await api(
        `${r.username === username ? '/reviews' : '/admin/reviews'}/${uuid}/${r.id}`,
        'DELETE',
      );
      setRevision((v) => v + 1);
    } catch (e) {
      problem(e);
    }
  }
  return (
    <section className="reviews">
      <h2>{t('My Review')}</h2>
      {!has(scope.reviewWrite) && (
        <p className="warning">You don't have permission to update reviews.</p>
      )}
      <Stars rating={own?.rating} />
      {own && <p>{own.content}</p>}
      {has(scope.reviewWrite) && (
        <div className="row-actions">
          {own ? (
            <>
              <Button variant="ghost" onPress={() => edit(own)}>
                {t('Edit')}
              </Button>
              <Button variant="ghost" onPress={() => remove(own)}>
                {t('Delete')}
              </Button>
            </>
          ) : (
            <Button
              variant="ghost"
              isDisabled={!published}
              title={
                !published
                  ? "Can't perform the action. This release isn't in an installable state."
                  : undefined
              }
              onPress={() => edit()}
            >
              {t('Write a Review')}
            </Button>
          )}
        </div>
      )}
      {rating && (
        <div className="rating-summary">
          <strong>{rating.ratingValue.toFixed(1)}</strong>
          <Stars rating={rating.ratingValue} />
          <span>{rating.noOfUsers}</span>
          {[5, 4, 3, 2, 1].map((n) => (
            <div key={n}>
              {n}{' '}
              <meter
                min={0}
                max={Math.max(rating.noOfUsers, 1)}
                value={rating.ratingVariety[n] || 0}
              />
            </div>
          ))}
        </div>
      )}
      <div className="community">
        {reviews.map((r) => (
          <article key={r.id}>
            <strong>{r.username}</strong>
            <Stars rating={r.rating} />
            <p>{r.content}</p>
            {r.username !== username && has(scope.reviewAdmin) && (
              <Button variant="ghost" onPress={() => remove(r)}>
                {t('Delete')}
              </Button>
            )}
          </article>
        ))}
      </div>
      {count > reviews.length && (
        <Button variant="ghost" onPress={() => setReviewLimit((n) => n + 20)}>
          {t('Read all reviews')}
        </Button>
      )}
      <Dialog
        open={editor}
        onClose={() => setEditor(false)}
        title={t('Write a Review')}
        footer={
          <>
            <Button variant="secondary" onPress={() => setEditor(false)}>
              {t('Cancel')}
            </Button>
            <Button
              isPending={busy}
              isDisabled={!stars || !content.trim()}
              onPress={async () => {
                setBusy(true);
                try {
                  await api(
                    `/reviews/${uuid}${own ? '/' + own.id : ''}`,
                    own ? 'PUT' : 'POST',
                    { rating: stars, content },
                  );
                  setEditor(false);
                  setRevision((v) => v + 1);
                } catch (e) {
                  problem(e, 'We are unable to add your review right now.');
                } finally {
                  setBusy(false);
                }
              }}
            >
              {t('Save')}
            </Button>
          </>
        }
      >
        <Stars rating={stars} onChange={setStars} />
        <TextArea
          aria-label="Review"
          value={content}
          onChange={(e) => setContent(e.target.value)}
        />
      </Dialog>
    </section>
  );
}
