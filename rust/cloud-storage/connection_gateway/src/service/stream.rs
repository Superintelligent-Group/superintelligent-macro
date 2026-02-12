use crate::model::{
    connection::ConnectionContext, message::OutgoingMessage, websocket::SubscribeEntityMessage,
};
use anyhow::Result;
use futures::StreamExt;

pub async fn subscribe_entity(
    context: ConnectionContext<'_>,
    data: SubscribeEntityMessage,
    sender: &tokio::sync::mpsc::Sender<OutgoingMessage>,
) -> Result<()> {
    let entity_id = data.entity.entity_id.to_string();
    let mut item_stream = context
        .api_context
        .stream_manager
        .subscribe(entity_id)
        .await
        .map_err(|e| anyhow::anyhow!("{e}"))?;

    while let Some(item) = item_stream.next().await {
        let Ok(msg) = OutgoingMessage::try_from(item) else {
            tracing::warn!("stream item conversion failed, skipping");
            continue;
        };
        if sender.send(msg).await.is_err() {
            break;
        }
    }

    Ok(())
}
