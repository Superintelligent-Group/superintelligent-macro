use crate::domain::{ItemStream, Result, StreamManager, StreamRepo};
use async_stream::stream;
use async_trait::async_trait;
use futures::stream::{SelectAll, StreamExt};
use std::sync::Arc;

pub struct RedisStreamManager {
    repo: Arc<dyn StreamRepo>,
}

impl RedisStreamManager {
    pub fn new(repo: Arc<dyn StreamRepo>) -> Arc<Self> {
        Arc::new(Self { repo })
    }
}

#[async_trait]
impl StreamManager for RedisStreamManager {
    #[tracing::instrument(err, skip(self))]
    async fn subscribe(&self, entity_id: String) -> Result<ItemStream> {
        let repo = self.repo.clone();

        let active = repo.active_streams(&entity_id).await?;
        let mut notify_rx = repo.notify().await;

        let mut merged = SelectAll::new();
        for id in active {
            let s = repo.stream_from_beginning(&id).await?;
            merged.push(s);
        }

        let out = stream! {
            loop {
                tokio::select! {
                    item = merged.next(), if !merged.is_empty() => {
                        match item {
                            Some(item) => {
                                yield item
                            },

                            None => {} // all current streams exhausted, keep listening
                        }
                    }
                    notification = notify_rx.recv() => {
                        match notification {
                            Ok(stream_id) if stream_id.entity_id == entity_id => {
                                match repo.stream_from_beginning(&stream_id).await {
                                    Ok(stream) => merged.push(stream),
                                    Err(e) => {
                                        tracing::error!(error=?e, "failed to stream from beginning");
                                    }
                                }
                            },
                            Ok(_) => continue,
                            Err(_) => break
                        }
                    }
                }
            }
        };

        Ok(Box::pin(out))
    }
}
