use crate::model::message::OutgoingMessage;
use anyhow::Result;
use futures::StreamExt;
use std::sync::Arc;
use stream::domain::StreamManager;

#[tracing::instrument(err, skip(stream_manager, sender))]
pub async fn subscribe_entity(
    stream_manager: Arc<dyn StreamManager>,
    entity_id: String,
    sender: tokio::sync::mpsc::Sender<OutgoingMessage>,
) -> Result<()> {
    let mut item_stream = stream_manager.subscribe(entity_id).await?;

    tokio::spawn(async move {
        while let Some(item) = item_stream.next().await {
            let Ok(msg) = OutgoingMessage::try_from(item) else {
                tracing::warn!("stream item conversion failed, skipping");
                continue;
            };
            if sender.send(msg).await.is_err() {
                break;
            }
        }
    });

    Ok(())
}
