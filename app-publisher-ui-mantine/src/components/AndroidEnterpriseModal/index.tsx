/*
 * Copyright (C) 2018 - 2024 Entgra (Pvt) Ltd, Inc - All Rights Reserved.
 *
 * Unauthorised copying/redistribution of this file, via any medium is strictly prohibited.
 *
 * Licensed under the Entgra Commercial License, Version 1.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *       https://entgra.io/licenses/entgra-commercial/1.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */
import { Box, Modal, VisuallyHidden } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { playApproveUrl } from "../../services/platformContracts";
export default function AndroidEnterpriseModal({
  opened,
  token,
  onClose,
}: {
  opened: boolean;
  token: string | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      opened={opened && !!token}
      onClose={onClose}
      centered
      size={740}
      padding="lg"
      title={<VisuallyHidden>{t("ae.approveTitle")}</VisuallyHidden>}
      closeButtonProps={{ "aria-label": t("platform.close") }}
    >
      {opened && token && (
        <Box
          component="iframe"
          src={playApproveUrl(token)}
          title={t("ae.approveTitle")}
          w="100%"
          h="min(680px, 75vh)"
          style={{ border: 0, display: "block" }}
          referrerPolicy="strict-origin-when-cross-origin"
        />
      )}
    </Modal>
  );
}
